import User from "../models/user.model.js"
import AppError from "../utils/error.util.js"

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

const login = async (req, res) => {
    try {
        const { email, password } = req.body

        if( !email || !password ){
            return next(new AppError('All fields are required', 400))
        }

        const user = await User.findOne({
            email
        }).select('+password')      //we have set select:false for password in schema so it won't come by default hence we have to call it explicitly

        if(!user || !user.comparePassword(password)) {
            return next(new AppError('Email or password does not match', 400))   
        }

        const token = await user.generateJWTToken()

        user.password = undefined

        //setting token in cookie
        res.cookie('token', token, cookieOptions)

        res.status(200).json({
            success: true,
            message: 'User logged in successfully',
            user,
        })
    } catch (e) {
        return next(new AppError(e.message, 500))   
    }
}

const logout = (req, res) => {
    res.cookie('token', null, {
        secure: true,
        maxAge: 0,
        httpOnly: true
    })

    res.status(200).json({
        success: true,
        message: 'User logged out successfully'
    })
}

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id 
        const user = await User.findById(userId)

        res.status(200).json({
            success: true,
            message: 'User details',
            user
        })
    } catch (e) {
        return next(new AppError('Failed to fetch profile details', 500))    
    }
}

export {
    register, login, logout, getProfile
}


