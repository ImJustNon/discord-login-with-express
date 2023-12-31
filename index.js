require("dotenv").config();
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const axios = require('axios');
const http = require("http");
const morgan = require("morgan");
const app = express();
const server = http.createServer(app);
const port = process.env.PORT;

// setup mongodb session
const mongoDBStore = new MongoDBStore({
    uri: process.env.MONGO_URI,
    collection: 'test-discord-login-session',
});
mongoDBStore.on('error', (error) => {
    console.log('[SESSION-ERROR] MongoDB session store error:', error);
});
mongoDBStore.on('connected', (error) => {
    console.log('[SESSION] MongoDB session store : Connected');
    startListenPort();
});


// MongoDB ver
app.use(session({
    secret: 'nonlnwza',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 86400000,  // 86400000 ms = 1 day
    },
    store: mongoDBStore,
}));
app.use(morgan("dev"));

// routes setup
app.get('/auth/discord', (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        redirect_uri: process.env.REDIRECT_URI,
        response_type: 'code',
        scope: 'identify', // Adjust scopes as needed
    });

    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    try {
        const response = await axios.post(
            'https://discord.com/api/oauth2/token',
            `client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=${process.env.REDIRECT_URI}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const accessToken = response.data.access_token;

        // Fetch user data from Discord API using the access token
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const user = userResponse.data;

        // Save user data in the session
        req.session.user = user;

        res.redirect('/dashboard'); // Redirect to the dashboard or authorized page
    } catch (error) {
        console.error('Error exchanging code for access token:', error.response.data);
        res.status(500).send('An error occurred during login.');
    }
});
app.get('/dashboard', (req, res) => {
    // Check if the user is logged in
    if (!req.session.user) {
        return res.redirect('/auth/discord'); // Redirect to login if not logged in
    }

    // User is logged in, display the dashboard
    const user = req.session.user;
    // res.send(`Welcome to your dashboard, ${user.username}#${user.discriminator}!`);
    res.json(user);
});


// start server
function startListenPort(){
    server.listen(port);
}
server.on("listening", async() =>{
    console.log(("[APP] ") + (`Localhost : http://127.0.0.1:${port}`));
    console.log(("[APP] ") + (`Listening on port : `) + (port));
});
server.on("error", (err) =>{
    console.log("[APP-ERROR] " + err);
});
