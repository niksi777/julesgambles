require('dotenv').config({ path: '/root/julesgambles/.env' });
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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

// ─── Gamba leaderboard ────────────────────────────────────────────────────
const GAMBA_RACE_ID = 16798;
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT, wager REAL, position INTEGER, avatar TEXT, reward REAL
  )`);
});

let gambaMeta = { endDate: null, prizePool: null };

async function updateLeaderboard() {
  try {
    const gql = JSON.stringify({
      query: `query { getRaceById(raceId: ${GAMBA_RACE_ID}) { id prize_pool start_date end_date race_name competitors { id display_name total_wagered position avatar vip_level_name } prize_distribution { position percentage amount } } }`
    });
    const response = await fetch('https://gamba.com/_api/@', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': `https://gamba.com/promotions/exclusive-leaderboards/${GAMBA_RACE_ID}`,
        'Origin': 'https://gamba.com',
      },
      body: gql,
    });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { console.log('Gamba non-JSON response'); return; }

    const race = json.data && json.data.getRaceById;
    if (!race) { console.log('Gamba: no race data'); return; }

    gambaMeta.endDate = race.end_date ? race.end_date.replace(' ', 'T') + 'Z' : null;
    gambaMeta.prizePool = race.prize_pool || null;

    const competitors = race.competitors;
    if (!competitors || competitors.length === 0) { console.log('Gamba: no competitors'); return; }

    const prizes = race.prize_distribution || [];
    db.run('DELETE FROM players');
    competitors.forEach(player => {
      const prize = prizes.find(p => p.position === player.position);
      db.run(
        'INSERT INTO players (username, wager, position, avatar, reward) VALUES (?, ?, ?, ?, ?)',
        [player.display_name, player.total_wagered, player.position, player.avatar, prize ? prize.amount : 0]
      );
    });
    console.log(`Gamba leaderboard updated: ${competitors.length} players`);
  } catch (err) {
    console.log('Gamba update error:', err.message);
  }
}

setInterval(updateLeaderboard, 150000);
updateLeaderboard();

app.get('/players', (req, res) => {
  db.all('SELECT * FROM players ORDER BY position ASC', [], (err, rows) => {
    if (err) return res.json([]);
    res.json(rows);
  });
});

app.get('/gamba-meta', (req, res) => res.json(gambaMeta));

// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`julesgambles running on port ${PORT}`));
