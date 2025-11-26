import axios from 'axios';
import { FLASK_URL } from '../constants/env';

const options = {
    baseURL: FLASK_URL,
    withCredentials: true
}

export const API = axios.create(options)
