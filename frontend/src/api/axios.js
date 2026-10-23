import axios from "axios";

const api = axios.create({
    baseURL: "https://baleeg.onrender.com/api", // Must be http://localhost, NOT http://localhost:5173
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;