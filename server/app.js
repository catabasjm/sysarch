const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const port = 3300;

// Set up multer for file uploads
const uploadsDir = path.join(__dirname, 'uploads');
// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Create and connect to SQLite database
const dbPath = path.resolve(__dirname, 'users_db.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to SQLite database");
    
    // Create users table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT
    )`, (err) => {
      if (err) {
        console.error("Error creating users table:", err.message);
      } else {
        console.log("Users table ready");
      }
    });
    
    // Create students table if it doesn't exist 
    db.run(`CREATE TABLE IF NOT EXISTS students (
      idno TEXT PRIMARY KEY,
      lastname TEXT NOT NULL,
      firstname TEXT NOT NULL,
      course TEXT NOT NULL,
      level INTEGER NOT NULL,
      photo TEXT
    )`, (err) => {
      if (err) {
        console.error("Error creating students table:", err.message);
      } else {
        console.log("Students table ready");
        
        // Add some sample data if the table is empty
        db.get("SELECT COUNT(*) as count FROM students", (err, row) => {
          if (err) {
            console.error("Error checking student count:", err.message);
            return;
          }
        });
      }
    });
  }
});

const app = express();
app.use(cors({
  origin: 'http://localhost:3000', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: "error",
    message: err.message || "An unexpected error occurred"
  });
});

// Photo upload route
app.post("/upload", upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: "error", message: "No file uploaded" });
  }
  
  res.json({
    status: "success",
    message: "File uploaded successfully",
    filename: req.file.filename
  });
});

// LOGIN/REGISTER ROUTES

// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ status: "error", message: "Email and password are required" });
  }
  
  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
  
  db.get(sql, [email, password], (err, row) => {
    if (err) {
      console.error("Login Error:", err.message);
      return res.status(500).json({ status: "error", message: "Database error" });
    }
    
    if (row) {
      return res.json({ 
        status: "success", 
        message: "Login successful",
        user: {
          id: row.id,
          name: row.name,
          email: row.email
        }
      });
    } else {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }
  });
});

// Registration route
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ status: "error", message: "All fields are required" });
  }
  
  // Check if user already exists
  const checkUser = "SELECT * FROM users WHERE email = ?";
  db.get(checkUser, [email], (err, row) => {
    if (err) {
      console.error("Registration Error:", err.message);
      return res.status(500).json({ status: "error", message: "Database error" });
    }
    
    // If user already exists
    if (row) {
      return res.status(409).json({ status: "error", message: "User with this email already exists" });
    }
    
    // If user doesn't exist, create new user
    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    db.run(sql, [name, email, password], function(err) {
      if (err) {
        console.error("Registration Error:", err.message);
        return res.status(500).json({ status: "error", message: "Database error" });
      }
      
      return res.status(201).json({ 
        status: "success", 
        message: "Registration successful",
        userId: this.lastID
      });
    });
  });
});

app.get("/users", (req, res) => {
  const sql = "SELECT id, name, email FROM users"; // Don't return passwords
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error fetching users:", err.message);
      return res.status(500).json({ status: "error", message: "Database error" });
    }
    
    res.json({ status: "success", users: rows });
  });
});

// STUDENT ROUTES

// Get all students
// Get all students - add photoUrl for each student
app.get("/students", (req, res) => {
  const sql = "SELECT * FROM students ORDER BY lastname ASC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Error fetching students:", err.message);
      return res.status(500).json({ status: "error", message: "Database error" });
    }
    
    // Add photoUrl for each student
    rows.forEach(student => {
      if (student.photo) {
        student.photoUrl = `/uploads/${student.photo}`;
      }
    });
    
    res.json(rows);
  });
});

// Get student by ID - add photoUrl
app.get("/students/:idno", (req, res) => {
  const idno = req.params.idno;
  const sql = "SELECT * FROM students WHERE idno = ?";
  
  db.get(sql, [idno], (err, row) => {
    if (err) {
      console.error("Error fetching student:", err.message);
      return res.status(500).json({ status: "error", message: "Database error" });
    }
    
    if (row) {
      // Add photo URL
      if (row.photo) {
        row.photoUrl = `/uploads/${row.photo}`;
      }
      res.json({ status: "success", student: row });
    } else {
      res.status(404).json({ status: "error", message: "Student not found" });
    }
  });
});

// Add a new student
app.post("/students", upload.single("photo"), (req, res) => {
  const { idno, lastname, firstname, course, level } = req.body;
  let photoFilename = null;

  // Validate required fields
  if (!idno || !lastname || !firstname || !course || !level) {
    return res.status(400).json({ status: "error", message: "All fields are required" });
  }

  // If file is uploaded directly, use it
  if (req.file) {
    const ext = path.extname(req.file.originalname);
    const newFilename = `${idno}_${firstname}_${lastname}${ext}`.replace(/\s+/g, "_"); // remove spaces
    const newFilePath = path.join(uploadsDir, newFilename);

    fs.renameSync(req.file.path, newFilePath);
    photoFilename = newFilename;
  } 
  // If photo is sent as string (filename from previous upload)
  else if (req.body.photo && typeof req.body.photo === 'string' && req.body.photo.trim() !== '') {
    photoFilename = req.body.photo;
  }

  // Check if student already exists
  const checkStudent = "SELECT * FROM students WHERE idno = ?";
  db.get(checkStudent, [idno], (err, row) => {
    if (err) {
      console.error("Error checking student:", err.message);
      return res.status(500).json({ status: "error", message: "Database error" });
    }

    if (row) {
      // Delete photo if student already exists
      if (photoFilename) {
        const photoPath = path.join(uploadsDir, photoFilename);
        if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
      }
      return res.status(409).json({ status: "error", message: "Student with this ID already exists" });
    }

    // Insert student record
    const sql = "INSERT INTO students (idno, lastname, firstname, course, level, photo) VALUES (?, ?, ?, ?, ?, ?)";
    db.run(sql, [idno, lastname, firstname, course, level, photoFilename], function(err) {
      if (err) {
        console.error("Error adding student:", err.message);
        return res.status(500).json({ status: "error", message: "Database error" });
      }

      return res.status(201).json({
        status: "success",
        message: "Student added successfully",
        student: { 
          idno, 
          lastname, 
          firstname, 
          course, 
          level, 
          photo: photoFilename,
          photoUrl: photoFilename ? `/uploads/${photoFilename}` : null,
          fullPhotoUrl: photoFilename ? `http://localhost:${port}/uploads/${photoFilename}` : null // Add this for debugging
        }
      });
    });
  });
});

// Update student information
// Update student information - add upload middleware to handle photo uploads
app.put("/students/:idno", upload.single("photo"), (req, res) => {
  const idno = req.params.idno;
  const { lastname, firstname, course, level } = req.body;
  let photoFilename = req.body.photo; // Keep existing photo if no new one
  
  // If a new file was uploaded
  if (req.file) {
    const ext = path.extname(req.file.originalname);
    const newFilename = `${idno}_${firstname}_${lastname}${ext}`.replace(/\s+/g, "_");
    const newFilePath = path.join(uploadsDir, newFilename);

    fs.renameSync(req.file.path, newFilePath);
    photoFilename = newFilename;
  }
  
  // Validate required fields
  if (!lastname || !firstname || !course || level === undefined) {
    return res.status(400).json({ status: "error", message: "All fields are required" });
  }
  
  // First check if student exists
  db.get("SELECT * FROM students WHERE idno = ?", [idno], (err, row) => {
    if (err) {
      console.error("Error checking student:", err.message);
      return res.status(500).json({ status: "error", message: "Database error" });
    }
    
    if (!row) {
      return res.status(404).json({ status: "error", message: "Student not found" });
    }
    
    // If updating photo, delete old photo if exists
    if (photoFilename && row.photo && photoFilename !== row.photo) {
      const oldPhotoPath = path.join(uploadsDir, row.photo);
      if (fs.existsSync(oldPhotoPath)) {
        try {
          fs.unlinkSync(oldPhotoPath);
          console.log(`Deleted old photo: ${row.photo}`);
        } catch (err) {
          console.error(`Error deleting old photo: ${err.message}`);
          // Continue with update despite error deleting photo
        }
      }
    }
    
    // Update the student
    const sql = `UPDATE students 
                SET lastname = ?, firstname = ?, course = ?, level = ?, photo = ? 
                WHERE idno = ?`;
    
    db.run(sql, [lastname, firstname, course, level, photoFilename, idno], function(err) {
      if (err) {
        console.error("Error updating student:", err.message);
        return res.status(500).json({ status: "error", message: "Database error" });
      }
      
      res.json({
        status: "success",
        message: "Student updated successfully",
        student: { 
          idno, 
          lastname, 
          firstname, 
          course, 
          level, 
          photo: photoFilename,
          photoUrl: photoFilename ? `/uploads/${photoFilename}` : null
        }
      });
    });
  });
});

// Delete a student
app.delete("/students/:idno", (req, res) => {
  const idno = req.params.idno;
  
  // First check if student exists
  db.get("SELECT * FROM students WHERE idno = ?", [idno], (err, row) => {
    if (err) {
      console.error("Error checking student:", err.message);
      return res.status(500).json({ status: "error", message: "Database error" });
    }
    
    if (!row) {
      return res.status(404).json({ status: "error", message: "Student not found" });
    }
    
    // Delete student's photo if exists
    if (row.photo) {
      const photoPath = path.join(uploadsDir, row.photo);
      if (fs.existsSync(photoPath)) {
        try {
          fs.unlinkSync(photoPath);
          console.log(`Deleted photo: ${row.photo}`);
        } catch (err) {
          console.error(`Error deleting photo: ${err.message}`);
          // Continue with deletion despite error deleting photo
        }
      }
    }
    
    // Delete the student
    const sql = "DELETE FROM students WHERE idno = ?";
    db.run(sql, [idno], function(err) {
      if (err) {
        console.error("Error deleting student:", err.message);
        return res.status(500).json({ status: "error", message: "Database error" });
      }
      
      res.json({ 
        status: "success", 
        message: "Student deleted successfully",
        idno 
      });
    });
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "up", message: "Server is running" });
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

// Close the database connection when the server is stopped
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});