import fs from "fs";
import csv from "csv-parser";

export async function getUserFromCsv(path) {
  return new Promise((resolve, reject) => {
    const users = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on("data", (data) => {
        const values = data[Object.keys(data)[0]].split(";");

        const lastName = values[0].split(" ")[1]; // Asume que el apellido es la primera palabra del nombre completo
        const firstName = values[0].split(" ")[0]; // Asume que el nombre es la segunda palabra del nombre completo
        const email = values[1]; // El email es el segundo valor en la lista de valores divididos
        const user = {
          first_name: firstName,
          user_email: email,
          learndash_courses: "12443",
          display_name: firstName,
        };
        if (!!lastName) {
          user.last_name = lastName.trim();
        }
        users.push(user);
      })
      .on("end", () => {
        resolve(users);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}
