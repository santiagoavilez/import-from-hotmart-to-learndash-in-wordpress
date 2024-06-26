import fs from "fs";
// Leer el archivo mindfulness-jugando.json

import learndashUsers from "./src/output-learndash.json" assert { type: "json" };
import mindfulnessUsers from "./src/output-learndash-mindfulness-jugando.json" assert { type: "json" };



// Convertir la lista de usuarios de learndash en un conjunto para búsqueda eficiente
const learndashUserEmails = new Set(
  learndashUsers.map((user) => user.user_email)
);

// Filtrar usuarios a los que hay que quitarles el acceso
const usersToRemoveAccess = mindfulnessUsers.filter(
  (user) => !learndashUserEmails.has(user.user_email)
);

console.log(`Usuarios a totales de mindfullness: ${mindfulnessUsers.length}`);

console.log(`Usuarios a remover el acceso: ${usersToRemoveAccess.length}`);

// Si es necesario, mostrar algunos emails para confirmar que existen en ambos arrays
// Esto es solo para propósitos de depuración y debe ser removido o comentado en producción
console.log(
  "Ejemplos de emails en learndashUsers:",
  [...learndashUserEmails].slice(0, 5)
);
console.log(
  "Ejemplos de emails en mindfulnessUsers:",
  mindfulnessUsers.map((user) => user.user_email).slice(0, 5)
);

// Guardar la lista de usuarios en un nuevo archivo JSON
fs.writeFileSync(
  "./src/users-to-remove-access.json",
  JSON.stringify(usersToRemoveAccess, null, 2),
  "utf-8"
);

console.log("El archivo users-to-remove-access.json ha sido creado con éxito.");


import axios from "axios";

// Configuración
const wpBaseUrl = process.env.WORDPRESS_SITE_URL; // URL base de la API REST de WordPress
const courseId = 12443; // ID del curso del que deseas eliminar usuarios
const wpUser = process.env.WORDPRESS_ADMIN_USER; // Usuario de WordPress
const wpPassword = process.env.WORDPRESS_APP_PASSWORD; // Contraseña de WordPress

// Archivo de salida para registrar los cambios
const outputFile = "user_remove_course_12443_log.txt";

// Borrar el archivo de salida existente
if (fs.existsSync(outputFile)) {
  fs.unlinkSync(outputFile);
}

// Función para obtener un usuario por correo electrónico
async function getUserByEmail(email) {
  try {
    const response = await axios.get(`${wpBaseUrl}/wp/v2/users`, {
      auth: {
        username: wpUser,
        password: wpPassword,
      },
      params: {
        search: email,
      },
    });
    if (response.data) {
      return response.data[0];
    } else return null;
  } catch (error) {
    console.error(`Error fetching user by email ${email}`, error);
    return null;
  }
}

// Función para verificar la inscripción en el curso
async function checkUserEnrollment(userId) {
  try {
    const response = await axios.get(
      `${wpBaseUrl}/ldlms/v2/users/${userId}/courses`,
      {
        auth: {
          username: wpUser,
          password: wpPassword,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error checking enrollment for user ID ${userId}`, error);
    return [];
  }
}


// Función para desinscribir al usuario del curso
async function unenrollUserFromCourse(userId, courseId) {
  try {
    const response = await axios.delete(
      `${wpBaseUrl}/ldlms/v2/users/${userId}/courses`,
      {
        data: { course_ids: [courseId] },
        auth: {
          username: wpUser,
          password: wpPassword,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      `Error unenrolling user ID ${userId} from course ${courseId}`,
      error
    );
    return null;
  }
}

// Función principal para actualizar los usuarios
async function updateUsers() {
  for (const user of usersToRemoveAccess) {
    const email = user.user_email;
    console.log(`Processing user with email ${email}...`);
    const wpUser = await getUserByEmail(email);

    if (wpUser) {
      const userId = wpUser.id;
      console.log(`User found with ID ${userId}.`);
      const enrolledCourses = await checkUserEnrollment(userId);

      if (enrolledCourses.some((course) => course.id === courseId)) {
        console.log(
          `User ${email} (ID: ${userId}) is enrolled in course ${courseId}. Unenrolling now. Eliminando acceso al curso.`
        );
        fs.appendFileSync(
          outputFile,
          `User ${email} (ID: ${userId}) is enrolled in course ${courseId}. Unenrolling now. Eliminando acceso al curso.\n`
        );

        const result = await unenrollUserFromCourse(userId, courseId);
        if (result) {
          console.log(
            `User ${email} (ID: ${userId}) successfully unenrolled from course ${courseId}. Eliminación de acceso exitosa.`
          );
          fs.appendFileSync(
            outputFile,
            `User ${email} (ID: ${userId}) successfully unenrolled from course ${courseId}. Eliminación de acceso exitosa. \n`
          );
        } else {
          console.error(
            `Failed to unenroll user ${email} (ID: ${userId}) from course ${courseId}.`
          );
          fs.appendFileSync(
            outputFile,
            `Failed to unenroll user ${email} (ID: ${userId}) from course ${courseId}.\n`
          );
        }
      } else {
        console.log(
          `User ${email} (ID: ${userId}) is not enrolled in course ${courseId}. Skipping user ${email}.`
        );
        fs.appendFileSync(
          outputFile,
          `User ${email} (ID: ${userId}) is not enrolled in course ${courseId}.\n`
        );
      }
    } else {
      console.log(`User with email ${email} not found.`);
      fs.appendFileSync(outputFile, `User with email ${email} not found.\n`);
    }
  }

  console.log("User unenrollment process complete.");
}

// Ejecutar la función principal
updateUsers();