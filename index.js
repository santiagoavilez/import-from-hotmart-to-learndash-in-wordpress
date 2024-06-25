const fs = require('fs');
const axios = require('axios');

// Configuración
const usersFile = 'filtered_users/user_filtered.ld'; // Archivo con los usuarios filtrados
const wpBaseUrl = 'https://tu-sitio.com/wp-json'; // URL base de la API REST de WordPress
const courseId = 24258;  // ID del curso que deseas agregar
const wpUser = 'tu_usuario_wp'; // Usuario de WordPress
const wpPassword = 'tu_password_wp'; // Contraseña de WordPress

// Archivo de salida para registrar los cambios
const outputFile = 'user_update_log.txt';

// Borrar el archivo de salida existente
if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
}

// Función para obtener todos los usuarios de WordPress
async function getAllUsers() {
    try {
        let allUsers = [];
        let page = 1;
        let totalPages = 1; // Establece un valor inicial, se actualizará con la respuesta real

        // Itera a través de todas las páginas de usuarios
        while (page <= totalPages) {
            const response = await axios.get(`${wpBaseUrl}/wp/v2/users`, {
                auth: {
                    username: wpUser,
                    password: wpPassword
                },
                params: {
                    per_page: 100, // Ajusta el número de usuarios por página según sea necesario
                    page
                }
            });

            // Actualiza el total de páginas si es la primera iteración
            if (page === 1) {
                totalPages = response.headers['x-wp-totalpages'];
            }

            // Agrega los usuarios de esta página al array
            allUsers = [...allUsers, ...response.data];

            // Incrementa la página para la próxima solicitud
            page++;
        }

        return allUsers;
    } catch (error) {
        console.error('Error fetching all users:', error);
        return [];
    }
}

// Función para buscar un usuario por correo electrónico en la lista de todos los usuarios
function getUserByEmail(allUsers, email) {
    return allUsers.find(user => user.email === email);
}

// Función para verificar la inscripción en el curso
async function checkUserEnrollment(userId) {
    try {
        const response = await axios.get(
            `${wpBaseUrl}/ldlms/v2/users/${userId}/courses`,
            {
                auth: {
                    username: wpUser,
                    password: wpPassword
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error(`Error checking enrollment for user ID ${userId}`, error);
        return [];
    }
}

// Función para inscribir al usuario en el curso
async function enrollUserInCourse(userId, courseId) {
    try {
        const response = await axios.post(
            `${wpBaseUrl}/ldlms/v2/users/${userId}/courses`,
            { course_ids: [courseId] },
            {
                auth: {
                    username: wpUser,
                    password: wpPassword
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error(`Error enrolling user ID ${userId} in course ${courseId}`, error);
        return null;
    }
}

// Función principal para actualizar los usuarios
async function updateUsers() {
    try {
        // Obtener todos los usuarios de WordPress
        const allUsers = await getAllUsers();

        // Leer usuarios del archivo y procesar uno por uno
        const usersData = fs.readFileSync(usersFile, 'utf-8').split('\n').filter(Boolean);
        const users = usersData.map(JSON.parse);

        for (const user of users) {
            const email = user.wp_user.user_email;

            // Buscar usuario por email en el array de todos los usuarios
            const wpUser = getUserByEmail(allUsers, email);

            if (!wpUser) {
                console.log(`User with email ${email} not found.`);
                fs.appendFileSync(outputFile, `User with email ${email} not found.\n`);
                continue;
            }

            const userId = wpUser.id;

            // Verificar si el usuario está inscrito en el curso
            const enrolledCourses = await checkUserEnrollment(userId);

            if (!enrolledCourses.some(course => course.id === courseId)) {
                console.log(`User ${email} (ID: ${userId}) is not enrolled in course ${courseId}. Enrolling now.`);
                fs.appendFileSync(outputFile, `User ${email} (ID: ${userId}) is not enrolled in course ${courseId}. Enrolling now.\n`);

                const result = await enrollUserInCourse(userId, courseId);
                if (result) {
                    console.log(`User ${email} (ID: ${userId}) successfully enrolled in course ${courseId}.`);
                    fs.appendFileSync(outputFile, `User ${email} (ID: ${userId}) successfully enrolled in course ${courseId}.\n`);
                } else {
                    console.error(`Failed to enroll user ${email} (ID: ${userId}) in course ${courseId}.`);
                    fs.appendFileSync(outputFile, `Failed to enroll user ${email} (ID: ${userId}) in course ${courseId}.\n`);
                }
            } else {
                console.log(`User ${email} (ID: ${userId}) is already enrolled in course ${courseId}.`);
                fs.appendFileSync(outputFile, `User ${email} (ID: ${userId}) is already enrolled in course ${courseId}.\n`);
            }
        }

        console.log('User enrollment update process complete.');
    } catch (error) {
        console.error('Error updating users:', error);
    }
}

// Ejecutar la función principal
updateUsers();

