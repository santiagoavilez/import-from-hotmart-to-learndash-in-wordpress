
import fs from 'fs';

import csv from 'csv-parser';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
// Inicializar el escritor CSV con las cabeceras requeridas
const csvWriter = createCsvWriter({
  path: "./src/output-learndash-mindfulness-jugando.csv",
  header: [
    { id: "user_email", title: "user_email" },
    { id: "learndash_courses", title: "learndash_courses" },
    { id: "first_name", title: "first_name" },
    { id: "last_name", title: "last_name" },
    { id: "display_name", title: "display_name" },
    // Añadir más columnas según sea necesario
  ],
});

const results = [];

fs.createReadStream('./src/mindfulness-jugando.csv')
  .pipe(csv())
  .on('data', (data) => {
    // Suponiendo que la primera columna contiene el nombre completo en el formato "Apellido, Nombre"
    const values = data[Object.keys(data)[0]].split(';');

    const lastName = values[0].split(' ')[1]; // Asume que el apellido es la primera palabra del nombre completo
    const firstName = values[0].split(' ')[0]; // Asume que el nombre es la segunda palabra del nombre completo
    const email = values[1]; // El email es el segundo valor en la lista de valores divididos
    const result ={
        first_name:firstName,
        user_email:email,
        learndash_courses: '12443',
        display_name: firstName,
    }
    if (!!lastName){
        result.last_name = lastName.trim();
    }
    console.log('lastName ',lastName);
    console.log('firstName ',firstName);
    console.log('email ',email);
    results.push(result);
  })
  .on('end', () => {

    csvWriter
      .writeRecords(results)
      .then(() => console.log('El archivo CSV ha sido creado exitosamente.'))
      .then(() => {
        // Convertir results a JSON y escribir en un archivo
        fs.writeFile(
          "./src/output-learndash-mindfulness-jugando.json",
          JSON.stringify(results, null, 2),
          (err) => {
            if (err) {
              console.error("Error al escribir el archivo JSON", err);
            } else {
              console.log("El archivo JSON ha sido creado exitosamente.");
            }
          }
        );
      });
  });