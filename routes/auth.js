const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const router = express.Router();

// Registro
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });

    try {
        const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (rows.length > 0)
            return res.status(400).json({ error: 'El email ya está registrado' });

        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, passwordHash]
        );

        res.json({ message: 'Usuario registrado correctamente' });
    } catch (err) {
        console.error('Error en register:', err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Login
// router.post('/login', async (req, res) => {
//     const { email, password } = req.body;

//     try {
//         const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
//         if (rows.length === 0)
//             return res.status(401).json({ error: 'Credenciales inválidas' });

//         const user = rows[0];
//         const validPass = await bcrypt.compare(password, user.password_hash);
//         if (!validPass)
//             return res.status(401).json({ error: 'Credenciales inválidas' });

//         const token = jwt.sign(
//             { id: user.id, role: user.role },
//             process.env.JWT_SECRET,
//             { expiresIn: '1h' }
//         );

//         res.json({ token });
//     } catch (err) {
//         console.error('Error en login:', err);
//         res.status(500).json({ error: 'Error en el servidor' });
//     }
// });
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0)
            return res.status(401).json({ error: 'Credenciales inválidas' });

        const user = rows[0];
        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass)
            return res.status(401).json({ error: 'Credenciales inválidas' });

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Enviar token en cookie httpOnly
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // solo en HTTPS
            maxAge: 60 * 60 * 1000, // 1 hora en ms
            sameSite: 'strict', // o 'lax' según necesidades
            path: '/', // cookie válida para toda la app
        });

        res.json({ message: 'Login correcto' });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Logout (eliminar cookie)
router.post('/logout', (req, res) => {
    try {
        // Destruir la cookie 'token'
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        });

        res.json({ message: 'Sesión cerrada correctamente' });
    } catch (err) {
        console.error('Error en logout:', err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});


module.exports = router;
