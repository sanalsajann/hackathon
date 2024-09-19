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
   supervisor_id:String,
});

// Create a model for shifts (Shift In)
const Shift = mongoose.model('Shift', shiftSchema);

// Define a separate schema for Shift Out
// Define a separate schema for Shift Out (including supid and kilos)
const shiftOutSchema = new mongoose.Schema({
    fullName: String,
    shiftTime: String,
    sector: String,
    setNo: String,
    machine: String,
    kilos: Number          // Add kilos for amount of coal collected
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

// Route to handle Shift In submission
app.post('/submit-shift', async (req, res) => {
    try {
        console.log('Received Shift In data:', req.body);  // Add this line
        // Create a new shift document from the request body (Shift In)
        const newShift = new Shift({
            fullName: req.body.fullName,
            shiftTime: req.body.shiftTime,
            sector: req.body.sector,
            setNo: req.body.setNo,
            machine: req.body.machine,
            supervisor_id: req.body.supervisor_id,
        });

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
        const { fullName, shiftTime, sector, setNo, machine, kilos } = req.body;

        // Create a new ShiftOut document with the received data
        const newShiftOut = new ShiftOut({
            fullName: fullName,
            shiftTime: shiftTime,
            sector: sector,
            setNo: setNo,
            machine: machine,
            kilos: kilos       // Add kilos
        });

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

        console.log(`Received login attempt with Username: ${username}, Password: ${password}, Employee ID: ${employeeid}`);

        let Model = userType === 'supervisor' ? Supervisor : User;

        // Fetch the user matching the provided credentials
        const user = await Model.findOne({ username, employeeid });

        if (user) {
            console.log(`User found in database: ${user.username}`);

            // Compare the provided password with the stored hashed password
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (passwordMatch) {
                console.log(`User authentication successful: ${user.username}`);
                // Redirect based on user type
                const redirectUrl = userType === 'supervisor' ? 'supervisor-home.html' : 'employee-home.html';
                res.json({ success: true, redirectUrl });
            } else {
                console.log('Invalid password');
                res.json({ success: false, message: 'Invalid username, password, or employee ID' });
            }
        } else {
            console.log('No matching user found');
            res.json({ success: false, message: 'Invalid username, password, or employee ID' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});