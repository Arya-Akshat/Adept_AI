import axios from 'axios';
import { FASTAPI_URL } from '../constants/env';

const options = {
    baseURL: FASTAPI_URL,
    withCredentials: true
}

export const API = axios.create(options)
