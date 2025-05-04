import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../App.css';

const Dashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    idno: '',
    lastname: '',
    firstname: '',
    course: '',
    level: '',
    photoFile: null
  });

  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      navigate('/');
    } else {
      fetchStudents();
    }
  }, [navigate]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3300/students');
      setStudents(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students. Please try again later.');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate('/');
  };

  const handleEditClick = (student) => {
    setIsEditing(true);
    setFormData({
      idno: student.idno,
      lastname: student.lastname,
      firstname: student.firstname,
      course: student.course,
      level: student.level,
      photoFile: null
    });
    setImagePreview(student.photo ? `http://localhost:3300/uploads/${student.photo}` : null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({ ...formData, photoFile: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDelete = async (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.firstname} ${student.lastname}?`)) {
      try {
        await axios.delete(`http://localhost:3300/students/${student.idno}`);
        fetchStudents();
        if (isEditing && formData.idno === student.idno) {
          clearForm();
        }
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      // Create form data object to send to server
      const studentFormData = new FormData();
      studentFormData.append('idno', formData.idno);
      studentFormData.append('lastname', formData.lastname);
      studentFormData.append('firstname', formData.firstname);
      studentFormData.append('course', formData.course);
      studentFormData.append('level', formData.level);
      
      // If there's a photo file, append it directly
      if (formData.photoFile) {
        studentFormData.append('photo', formData.photoFile);
      } else if (isEditing) {
        // If editing and no new photo, keep the old one
        const currentStudent = students.find(s => s.idno === formData.idno);
        if (currentStudent && currentStudent.photo) {
          studentFormData.append('photo', currentStudent.photo);
        }
      }
      
      if (isEditing) {
        await axios.put(`http://localhost:3300/students/${formData.idno}`, studentFormData);
      } else {
        await axios.post('http://localhost:3300/students', studentFormData);
      }
      
      fetchStudents();
      clearForm();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Error saving student: ' + (error.response?.data?.message || error.message));
    }
  };

  const clearForm = () => {
    setFormData({ idno: '', lastname: '', firstname: '', course: '', level: '', photoFile: null });
    setImagePreview(null);
    setIsEditing(false);
  };

  return (
    <div className="container-fluid p-0">
      {/* Header */}
      <div className="header text-white p-3 d-flex justify-content-between align-items-center">
        <h3>STUDENT MANAGEMENT</h3>
        <button onClick={handleLogout} className="btn btn-light">LOG-OUT</button>
      </div>

      <div className="container mt-4">
        <div className="row">
          <div className="col-md-8">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title mb-3">Student List</h5>
                {loading ? (
                  <p>Loading students...</p>
                ) : error ? (
                  <p>{error}</p>
                ) : (
                  <table className="table table-striped table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>IDNO</th>
                        <th>LASTNAME</th>
                        <th>FIRSTNAME</th>
                        <th>COURSE</th>
                        <th>LEVEL</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length > 0 ? (
                        students.map((student, index) => (
                          <tr key={index}>
                            <td>{student.idno}</td>
                            <td>{student.lastname.toUpperCase()}</td>
                            <td>{student.firstname.toUpperCase()}</td>
                            <td>{student.course.toUpperCase()}</td>
                            <td>{student.level}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-primary me-1"
                                onClick={() => handleEditClick(student)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(student)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6">No students found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title mb-3">
                  {isEditing ? 'Edit Student' : 'Add New Student'}
                </h5>
                <div className="text-center mb-3">
                  <div className="border rounded-circle mx-auto mb-2" style={{width: '150px', height: '150px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="img-fluid" />
                    ) : (
                      <i className="bi bi-person" style={{fontSize: '5rem'}}></i>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="btn btn-outline-primary btn-sm">
                      <i className="bi bi-upload"></i> {isEditing ? 'Change Photo' : 'Upload Photo'}
                      <input 
                        type="file" 
                        style={{display: 'none'}} 
                        onChange={handleImageSelect}
                        accept="image/*"
                      />
                    </label>
                  </div>
                </div>
                <div className="mb-2">
                  <label className="form-label">ID Number</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    name="idno" 
                    value={formData.idno} 
                    onChange={handleInputChange}
                    readOnly={isEditing}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Last Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    name="lastname" 
                    value={formData.lastname} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">First Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    name="firstname" 
                    value={formData.firstname} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Course</label>
                  <select
                    className="form-control"
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Course</option>
                    <option value="BSIT">BSIT</option>
                    <option value="BSCS">BSCS</option>
                    <option value="BSBA">BSBA</option>
                    <option value="BSED">BSED</option>
                    <option value="BEED">BEED</option>
                    <option value="BSCPE">BSCPE</option>
                    <option value="BSCRIM">BSCRIM</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Level</label>
                  <select 
                    type="number" 
                    className="form-control" 
                    name="level" 
                    value={formData.level} 
                    onChange={handleInputChange} 
                  >
                    <option value="">Select Level</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </div>
                <div className="mt-3 d-flex justify-content-between">
                  <button type="button" className="btn btn-success" onClick={handleSubmit}>
                    {isEditing ? 'Update' : 'Add'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={clearForm}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;