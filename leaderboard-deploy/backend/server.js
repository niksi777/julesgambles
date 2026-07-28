require('dotenv').config({ path: '/root/julesgambles/.env' });
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = 4000;

// SPA routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/app.html')));
app.get('/leaderboards', (req, res) => res.sendFile(path.join(__dirname, '../frontend/app.html')));
app.get('/rewards', (req, res) => res.sendFile(path.join(__dirname, '../frontend/app.html')));

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));

app.listen(PORT, () => console.log(`julesgambles server running on port ${PORT}`));
