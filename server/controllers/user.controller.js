import User from "../models/user.model"
import AppError from "../utils/error.utils"

const cookieOptions ={ 
    maxAge: 7 * 24 * 60 * 60 * 1000,  // for 7 days
    httpOnly: true,
    secure: true
}
const register = async (req, res, next) => {
    const { fullName, email, password } = req.body

    if( !fullName || !email || !password ){
        return next(new AppError('All fields are required', 400))
    }

    const userExists = await User.findOne({email})

    if(userExists){
        return next(new AppError('Email already exists!', 400))
    }

    //adding user in database 
    const user = await User.create({
        fullName, 
        email, 
        password, 
        avatar: {
            public_id: email,
            secure_url: ''
        }
    })

    if(!user){
        return next(new AppError('User registration failed', 400))
    }

    //TODO: FILE UPLOAD

    await user.save()

    user.password = undefined

    const token = await user.generateJWTToken()

    //setting token in cookie
    res.cookie('token', token, cookieOptions)
    //as we have done setting token in cookie, now user won't need to do login 

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user,
    })
}

const login = (req, res) => {

}

const logout = (req, res) => {

}

const getProfile = (req, res) => {

}

export {
    register, login, logout, getProfile
}


