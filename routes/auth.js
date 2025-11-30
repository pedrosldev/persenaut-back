const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - username
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre completo del usuario
 *                 example: Juan Pérez
 *               username:
 *                 type: string
 *                 description: Nombre de usuario único
 *                 example: juanperez123
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico único
 *                 example: juan@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Contraseña (mínimo 6 caracteres)
 *                 example: password123
 *     responses:
 *       200:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuario registrado correctamente
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/register', async (req, res) => {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password)
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });

    try {
        const [rows] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
        if (rows.length > 0)
            return res.status(400).json({ error: 'El email o el nombre de usuario ya están registrados' });

        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (name, username, email, password_hash) VALUES (?, ?, ?, ?)',
            [name, username, email, passwordHash]
        );

        res.json({ message: 'Usuario registrado correctamente' });
    } catch (err) {
        console.error('Error en register:', err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Correo electrónico del usuario
 *                 example: juan@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del usuario
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login exitoso (token enviado en cookie httpOnly)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login correcto
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Credenciales inválidas
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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
            { id: user.id, name: user.name, username: user.username },
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

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Authentication]
 *     description: Elimina la cookie de autenticación del usuario
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sesión cerrada correctamente
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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

/**
 * @swagger
 * /auth/check-auth:
 *   get:
 *     summary: Verificar autenticación
 *     tags: [Authentication]
 *     description: Verifica si el usuario tiene una sesión activa válida
 *     responses:
 *       200:
 *         description: Estado de autenticación
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     isAuthenticated:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         name:
 *                           type: string
 *                           example: Juan Pérez
 *                         username:
 *                           type: string
 *                           example: juanperez123
 *                 - type: object
 *                   properties:
 *                     isAuthenticated:
 *                       type: boolean
 *                       example: false
 */
router.get('/check-auth', async (req, res) => {
    try {
       
        const token = req.cookies.token;
        if (!token) return res.json({ isAuthenticated: false });

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) return res.json({ isAuthenticated: false });
            res.json({ isAuthenticated: true, user: { id: decoded.id, name: decoded.name, username: decoded.username } });
        });
    } catch (err) {
        res.json({ isAuthenticated: false });
    }
});


module.exports = router;
