const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt'); // For password hashing
const app = express();
const port = 3000;

// Middleware to parse JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection string
const dbPassword = 'arjunpk22'; // Your actual password
const dbUser = 'arjunpk004'; // Your actual username
const dbCluster = 'hackathon.hqkbe.mongodb.net'; // Your actual cluster address
const dbName = 'your_database'; // Replace with your actual database name

const dbConnectionString = `mongodb+srv://${dbUser}:${dbPassword}@${dbCluster}/${dbName}?retryWrites=true&w=majority`;

// Connect to MongoDB
mongoose.connect(dbConnectionString, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB!'))
    .catch((err) => console.error('Connection failed', err));

// Define the MongoDB schema for shift information (Shift In)
const shiftSchema = new mongoose.Schema({
    fullName: String,
    shiftTime: String,
    sector: String,
    setNo: String,
    machine: String,
    supervisor_id: String,
});

// Create a model for shifts (Shift In)
const Shift = mongoose.model('Shift', shiftSchema);

// Define a separate schema for Shift Out
const shiftOutSchema = new mongoose.Schema({
    fullName: String,
    shiftTime: String,
    sector: String,
    setNo: String,
    machine: String,
    kilos: Number // Add kilos for amount of coal collected
});

// Create a model for Shift Out
const ShiftOut = mongoose.model('ShiftOut', shiftOutSchema);

// Define schemas for users and supervisors
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    employeeid: String
});

const User = mongoose.model('User', userSchema);
const Supervisor = mongoose.model('Supervisor', userSchema);

// Serve static files (like your HTML, CSS, and JavaScript files)
app.use(express.static('public'));

// Middleware to simulate user identification (e.g., from session or token)
app.use((req, res, next) => {
    // Simulate logged-in supervisor ID
    req.loggedInSupervisorId = '12345'; // Replace with actual logic
    next();
});

// Route to handle Shift In submission
app.post('/submit-shift', async (req, res) => {
    try {
        console.log('Received Shift In data:', req.body);
        
        // Create a new shift document from the request body (Shift In)
        const newShift = new Shift(req.body);

        // Save the Shift In document to the MongoDB collection
        await newShift.save();

        // Send success response
        res.status(200).json({ message: 'Shift In data saved successfully!' });
    } catch (error) {
        console.error('Error saving shift in data:', error);
        res.status(500).json({ message: 'Error saving shift in data' });
    }
});

// Route to handle Shift Out submission
app.post('/submit-shift-out', async (req, res) => {
    try {
        const newShiftOut = new ShiftOut(req.body); // Directly use req.body

        // Save the new ShiftOut document to MongoDB
        const savedShiftOut = await newShiftOut.save();
        
        res.status(200).json({ message: 'Shift out details added successfully', data: savedShiftOut });
    } catch (err) {
        console.error('Error saving shift out:', err);
        res.status(500).json({ message: 'Error saving shift out' });
    }
});

// Register route
app.post('/register', async (req, res) => {
    try {
        const { username, password, employeeid, userType } = req.body;

        let Model = userType === 'supervisor' ? Supervisor : User;

        // Check if the user already exists
        const existingUser = await Model.findOne({ username });
        if (existingUser) {
            return res.json({ success: false, message: 'Username already exists' });
        }

        // Hash the password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the appropriate collection
        await Model.create({
            username,
            password: hashedPassword,
            employeeid
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const { username, password, employeeid, userType } = req.body;

        console.log(`Received login attempt with Username: ${username}, Employee ID: ${employeeid}`);

        let Model = userType === 'supervisor' ? Supervisor : User;

        // Fetch the user matching the provided credentials
        const user = await Model.findOne({ username, employeeid });

        if (user) {
            // Compare the provided password with the stored hashed password
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (passwordMatch) {
                // Redirect based on user type
                const redirectUrl = userType === 'supervisor' ? 'dashboard.html' : 'homepage.html';
                res.json({ success: true, redirectUrl });
            } else {
                res.json({ success: false, message: 'Invalid username, password, or employee ID' });
            }
        } else {
            res.json({ success: false, message: 'Invalid username, password, or employee ID' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Route to get all employee shift details under a specific supervisor
app.get('/get-employee-details', async (req, res) => {
    try {
        const supervisorId = req.query.supervisorId;

        if (!supervisorId) {
            return res.status(400).json({ message: 'Supervisor ID is required' });
        }

        console.log(`Fetching shift details for supervisor ID: ${supervisorId}`);

        // Fetch all shift details for the given supervisor
        const shifts = await Shift.find({ supervisor_id: supervisorId });

        if (!shifts.length) {
            return res.status(404).json({ message: 'No shift details found for this supervisor' });
        }

        // Fetch shift-out details based on `fullName` only
        const shiftDetails = await Promise.all(shifts.map(async (shift) => {
            const shiftOut = await ShiftOut.findOne({ fullName: shift.fullName });
            return {
                id: shift.fullName,
                fullName: shift.fullName,
                machine: shift.machine,
                shiftIn: shift.shiftTime,
                shiftOut: shiftOut ? shiftOut.shiftTime : 'N/A',
                kilos: shiftOut ? shiftOut.kilos : 0 // Ensure kilos is a number
            };
        }));

        res.status(200).json(shiftDetails);
    } catch (err) {
        console.error('Error fetching employee details:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Route to get supervisor details
app.get('/supervisor-details', async (req, res) => {
    try {
        const supervisorId = req.query.supervisorId;

        if (!supervisorId) {
            return res.status(400).json({ message: 'Supervisor ID is required' });
        }

        console.log(`Fetching supervisor with ID: ${supervisorId}`);

        const supervisor = await Supervisor.findOne({ employeeid: supervisorId });

        if (supervisor) {
            res.status(200).json({
                id: supervisor.employeeid,
                name: supervisor.username
            });
        } else {
            res.status(404).json({ message: 'Supervisor not found' });
        }
    } catch (err) {
        console.error('Error fetching supervisor details:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Route to get total coal collected by sector
app.get('/coal-collected-by-sector', async (req, res) => {
    try {
        // Remove supervisorId filter
        console.log(`Fetching total coal collected by sector`);

        // Use aggregation to get total coal collected by sector
        const coalData = await ShiftOut.aggregate([
            {
                $group: {
                    _id: "$sector", // Group by sector
                    totalKilos: { $sum: "$kilos" } // Sum kilos for each sector
                }
            }
        ]);

        // Format the response to an easily usable format
        const sectorCoal = {};
        coalData.forEach(item => {
            sectorCoal[item._id] = item.totalKilos; // Create a key-value pair for each sector
        });

        res.status(200).json(sectorCoal);
    } catch (err) {
        console.error('Error fetching coal collected data:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
