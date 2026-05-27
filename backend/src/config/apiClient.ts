import axios from 'axios';
import { FASTAPI_URL } from '../constants/env';

const options = {
    baseURL: FASTAPI_URL,
    withCredentials: true,
    timeout: 80000 // 80 seconds timeout for Render safety
}

export const API = axios.create(options)
