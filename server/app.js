import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import userRoutes from './routes/user.routes.js'
import errorMiddleware from './middlewares/error.middleware.js'

import { config } from 'dotenv'
config()

const app = express()

app.use(express.json())
app.use(cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true
}))
app.use(cookieParser())
app.use(morgan('dev'))

app.use('/ping', function(req, res){
    res.send('/pong')
})


app.use('/api/v1/user',userRoutes)

//url which don't exists
app.all('*', (req, res) => {
    res.status(400).send('OOPS!! 404 page not found')
})

//if any error comes it will come here at the end to handle error
app.use(errorMiddleware)

export default app