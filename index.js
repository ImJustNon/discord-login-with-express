require("dotenv").config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const app = express();
const port = process.env.PORT;

app.use(session({
    secret: 'nonlnwza',
    resave: false,
    saveUninitialized: false,
}));

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
        const response = await axios.post('https://discord.com/api/oauth2/token', null, {
            params: {
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.REDIRECT_URI,
            },
        });

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
    res.send(`Welcome to your dashboard, ${user.username}#${user.discriminator}!`);
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
