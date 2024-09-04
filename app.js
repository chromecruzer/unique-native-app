// Packages
import http from 'http'
import express from 'express'
import compression from 'compression'
import cors from 'cors'
import 'colors'
import morgan from 'morgan'
import helmet from 'helmet'
import jwt from 'jsonwebtoken'

// Environmental variables
const host = process.env.HOST || '192.168.2.149'
const port = process.env.PORT || '2000'
const JWT_SECRET = process.env.SECRET;
const TOKEN_EXPIRATION = process.env.EXPIRES; // 30 days
const today = new Date()

// Server Middlewares
const app = express()
app.use(compression())
app.use(morgan('tiny'))
app.use(cors())
app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


// API Routes
app.get('/healthz', async (req, res) => {
    res.status(200).json({
        msg: `***Unique Force server is Healthy ${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()} ***`,
        contact: 'shayam.m.uniqueforce.in'
    });
});

// Fetch users from GitHub raw content
const fetchUsers = async () => {
    try {
        const response = await fetch('https://raw.githubusercontent.com/chromecruzer/unique-native-app/main/users.json');
        const users = await response.json();
        console.log(users)
        return users;
    } catch (error) {
        console.error('Failed to fetch users:', error);
        throw new Error('Failed to fetch users');
    }
};

// Endpoint for user login
app.post('/login', async (req, res) => {
    const { userid, pwd } = req.body;
    console.log(`From the client ${userid} -- ${pwd}`.blue)

    try {
        const users = await fetchUsers();
        const user = users.find(u => u.userid === userid && u.pwd === pwd);

        if (user) {
            const token = jwt.sign({ userid }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
            return res.json({ token });
        }

        return res.status(401).json({ error: 'Invalid credentials' });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Middleware to check JWT token
app.use((req, res, next) => {
    // Extract the Authorization header
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    // Check if the Authorization header is present
    if (!authHeader) return res.status(403).json({ error: 'No token provided' });

    // Extract the token from the header
    const token = authHeader.split(' ')[1]; // 'Bearer <token>'

    // Check if the token is provided
    if (!token) return res.status(403).json({ error: 'No token provided' });

    // Verify the token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).json({ error: 'Failed to authenticate token' });

        // Attach the userId from the token payload to the request object
        req.userId = decoded.userid;
        next();
    });
});


// Endpoint to fetch JSON data from GitHub raw content
app.get('/data/:filename', async (req, res) => {
    const { filename } = req.params;
    try {
        const response = await fetch(`https://raw.githubusercontent.com/chromecruzer/unique-native-app/main/${filename}.json`);
        const data = await response.json();
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch data' });
    }
});


// Daemon

// Create HTTP server
const server = http.createServer(app);

server.listen(port, host, () => {
    console.log(`server is running at http://${host}:${port}`.bgGreen.bgWhite)
})

// Graceful shutdown handling (os - pid)
const gracefulShutdown = () => {
    console.log('Received shutdown signal. Closing server gracefully...');

    server.close((err) => {
        if (err) {
            console.error('Error during server shutdown:', err);
            process.exit(1);
        }

        console.log('Server closed.');
        process.exit(0);
    });

    // If there are ongoing requests, you may want to implement additional logic here
    // to wait for them to complete before shutting down.
};

// Listen for shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);