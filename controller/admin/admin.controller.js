const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Model = require("../../models/user.model");
const catchAsync = require("../../utils/catchAsync");
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
// Helpers
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isStrongPassword = (password) => /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);


class AdminController {
  static registerAdmin = catchAsync(async (req, res) => {
  
    const { name, email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await Model.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ msg: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Model({
      name,
      email,
      password: hashedPassword,
      role: "admin"
    });

    await newAdmin.save();

    const token = jwt.sign(
      { id: newAdmin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({ msg: "Admin registered", token });
  });


// admin-Login
static loginAdmin=catchAsync(async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await Model.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET ,
      { expiresIn: '1d' }
    );

    // Exclude password from response
    const { password: _, ...adminData } = admin._doc;

    // Set cookie and respond
    res
      .cookie('admin_token', token, {
        httpOnly: true,
        secure: true, // true in production
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      })
      .status(200)
      .json({
        success: true,
        message: 'Login successful',
        admin: adminData,
        token
      });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

//register user
static registerUser=catchAsync( async (req, res) => {
  const { name, email, status, password, avatar,phoneNumber,organization, address,state,zipCode,country,language,timeZone,currency,isDeleted,deletedAt} = req.body;
 
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
 
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }
 
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters, include one uppercase letter, one number, and one special character",
    });
  }
 
  try {
    const existingUser = await Model.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
 
    const hashedPassword = await bcrypt.hash(password, 10);
 
      const user = new Model({
      name,phoneNumber,organization, address,state,zipCode,country,language,timeZone,currency,isDeleted,deletedAt,
        email,
        status,
        password: hashedPassword,
        role: "user",
      avatar: req.file ? `/uploads/profilepic/${req.file.filename}` : "",
      });
 
      await user.save();
      res.send({ success: true, user });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//get admin profile
static getProfile=catchAsync(async (req, res) => {

  try {
    const admin = await Model.findById(req.admin.id).select('-password'); // avoid returning password
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, admin });
  } catch (err) {
    console.error('Error in /me:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});




// Create user

static createUser=catchAsync( async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ msg: "Invalid email format" });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ msg: "Weak password" });
  }

  try {
    const existing = await Model.findOne({ email });
    if (existing) {
      return res.status(409).json({ msg: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const avatar = req.file ? `/uploads/profilepic/${req.file.filename}` : "";

    const newUser = new Model({
      name,
      email,
      password: hashed,
      role: "user", // Default role assigned by admin
      status: "inactive", // Default status
      avatar
    });

    await newUser.save();
    res.status(201).json({ msg: "User created successfully", user: newUser });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get all users
static getAllUsers=catchAsync(async (req, res) => {
  try {
    const users = await Model.find({isDeleted:false});
    res.status(200).json({ success:true, message: "Fetch all user successfully", users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
static getUserById=catchAsync(async (req, res) => {
  try {
    const user = await Model.findById(req.params.id).populate({
    path: 'posts',
    populate: [
      { path: 'comments.userId'}, // critical
      { path: 'likes' },
      { path: 'dislikes' }
    ]
  });
    if (!user) return res.status(404).json({ message: "data not found" });
    res
      .status(200)
      .json({ success:true , message: "Fetch the single user successfully", user });
  } catch (err) {
    res.status(500).json({success:false,  error: err.message });
  }
});

// Update user
static updateById=catchAsync(async (req, res) => {
  
  const file = req.file;

  try {
   const updateData = {
      ...req.body,
    };
    
    if (file) {
    updateData.avatar = `/uploads/profilepic/${file.filename}`;
      
    }

    const updatedUser = await Model.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedUser)
      return res.status(404).json({ success:false, message: "User not found" });

    res.status(200).json({
      success:true,
      message: "User updated successfully",
      updatedUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

static exportUser = catchAsync(async (req, res) => {
  try {
    const users = await Model.find({});

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'No users found' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    // Add header row
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
      {header:'CreatedAt',key:'createdAt',width:30},
    ];

    // Add data rows with alternating colors
    users.forEach((user, index) => {
      const row = worksheet.addRow({
        name: user.name,
        email: user.email,
        role: user.role,
         createdAt: new Date(user.createdAt).toLocaleString(),
      });
       row.eachCell((cell) => {
  cell.alignment = {
    wrapText: true,
    vertical: 'top',
  };
});

      if (index % 2 === 0) {
        // Apply background fill for even rows (0-based index)
        row.eachCell(cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEFEFEF' } // light gray
          };
        });
      }
        worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = {
        wrapText: true,
        vertical: 'middle',
        horizontal: 'center',
      };
    });
     
    });

    // Set response headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

static exportSingleUser = catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Model.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('User');

    // Define headers
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Language', key: 'language', width: 20 },
      { header: 'PhoneNumber', key: 'phoneNumber', width: 30 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'State', key: 'state', width: 25 },
      { header: 'Country', key: 'country', width: 25 },
      { header: 'ZipCode', key: 'zipCode', width: 25 },
      { header: 'Currency', key: 'currency', width: 15 },
      { header: 'Organization', key: 'organization', width: 30 },
      { header: 'TimeZone', key: 'timeZone', width: 35 },
      { header: 'CreatedAt', key: 'createdAt', width: 30 },
    ];

    // Add the user row
    const row = worksheet.addRow({
      name: user.name,
      email: user.email,
      role: user.role,
      language: user.language || 'N/A',
      phoneNumber: user.phoneNumber || 'N/A',
      address: user.address || 'N/A',
      state: user.state || 'N/A',
      country: user.country || 'N/A',
      zipCode: user.zipCode || 'N/A',
      currency: user.currency || 'N/A',
      organization: user.organization || 'N/A',
      timeZone: user.timeZone || 'N/A',
      createdAt: new Date(user.createdAt).toLocaleString(),
    });

    // Style the data row
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        wrapText: true,
        vertical: 'top',
      };

      // Alternate column coloring: A, C, E... (odd col index = even visually)
      if (colNumber % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEFEFEF' }, // light gray
        };
      }
    });

    // Style header row
    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = {
        wrapText: true,
        vertical: 'middle',
        horizontal: 'center',
      };
    });

    // Set response headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=user.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});



// Delete user
static deleteById = catchAsync(async (req, res) => {
  try {
    const user = await Model.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isDeleted) {
      return res.status(400).json({ success: false, message: 'User is already deleted' });
    }

    const deletedUser = await Model.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "User marked as deleted successfully",
      user: deletedUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

}

exports = module.exports = AdminController;
