const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;

dotenv.config();


const app = express();
const PORT = 7001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error('MongoDB connection error:', err));

const employeeSchema = new mongoose.Schema({
  name: String,
  email: String,
  mobile: String,
  designation: String,
  gender: String,
  courses: [String],
  image: [String]
}, {
  timestamps: true
});


const Employee = mongoose.model('Employee', employeeSchema);

const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

const uploadToCloudinary = (buffers) => {
  return Promise.all(buffers.map(buffer => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image' },
        (error, result) => {
          if (result) {
            resolve(result.secure_url);
          } else {
            reject(error);
          }
        }
      );
      streamifier.createReadStream(buffer).pipe(stream);
    });
  }));
};

app.post('/create', upload.array('images'), async (req, res) => {
  try {
    let imageUrls = [];

    if (req.files) {
      imageUrls = await uploadToCloudinary(req.files.map(file => file.buffer));
    }

    const newEmployee = new Employee({
      ...req.body,
      images: imageUrls
    });

    await newEmployee.save();
    res.status(201).json({ success: true, message: 'Employee added successfully', data: newEmployee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding employee', error });
  }
});


app.get('/view', async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.json({ success: true, data: employees.map(employee => ({
      ...employee.toObject(),
      created: employee.created,
      updated: employee.updated
    })) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching employees', error });
  }
});


app.get('/view/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (employee) {
      res.json({
        success: true,
        data: {
          ...employee.toObject(),
          created: employee.created,
          updated: employee.updated
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching employee', error });
  }
});


app.put('/edit/:id', upload.array('images'), async (req, res) => {
  try {
    let imageUrls = req.body.images || [];

    if (req.files) {
      const newImageUrls = await uploadToCloudinary(req.files.map(file => file.buffer));
      imageUrls = [...imageUrls, ...newImageUrls];
    }

    const updatedData = {
      ...req.body,
      images: imageUrls
    };

    const employee = await Employee.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (employee) {
      res.json({
        success: true,
        message: 'Employee updated successfully',
        data: {
          ...employee.toObject(),
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating employee', error });
  }
});



app.delete('/delete/:id', async (req, res) => {
  try {
    const result = await Employee.findByIdAndDelete(req.params.id);
    if (result) {
      res.json({ success: true, message: 'Employee deleted successfully', data: result });
    } else {
      res.status(404).json({ success: false, message: 'Employee not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting employee', error });
  }
});