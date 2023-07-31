import User from "../models/user.model.js"
import AppError from "../utils/error.util.js"
import cloudinary from 'cloudinary';
import fs from 'fs/promises'
import sendEmail from "../utils/sendEmail.js";

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

    // FILE UPLOAD

    console.log('File details > ', JSON.stringify(req.file))

    if(req.file) {
        try {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'lms',
                width: 250,
                height: 250,
                gravity: 'faces',
                crop: 'fill' 
            })

            if(result){
                user.avatar.public_id = result.public_id;
                user.avatar.secure_url = result.secure_url

                //remove file from server (which is in /uploads)
                fs.rm(`uploads/${req.file.filename}`)
            }
        } catch (e) {
            return next(new AppError(e || 'File Not uploaded, please try again!', 500))
        }
    }

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

const login = async (req, res, next) => {
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

    // res.clearCookie('token');

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

const forgotPassword = async (req, res, next) => {
    const { email } = req.body

    if(!email){
        return next(new AppError('Email is required', 400))    
    }

    const user = await User.findOne({email})
    if(!user) {
        return next(new AppError('Email not registered', 400))    
    }

    //generating random URL
    const resetToken = await user.generatePasswordResetToken()

    await user.save()

    const resetPasswordURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

    const subject = 'Reset Password'
    const message = `You can reset your password by clicking <a href=${resetPasswordURL} target="blank"> Reset your password</a>\n If the above link does not work for some reason then copy paste this link in new tab ${resetPasswordURL}. \n If you have not requested this, kindly ignore.`

    //sending email
    try{
        await sendEmail(email, subject, message)

        res.status(200).json({
            success: true,
            message: `Reset password token has been sent to ${email} successfully  `
        })
    }catch(e){
        //as email is not sent
        user.forgotPasswordExpiry = undefined 
        user.forgotPasswordToken = undefined
        await user.save()
        
        return next(new AppError(e.message, 500))    
    }
}

const resetPassword = () => {
    
}
export {
    register, login, logout, getProfile, forgotPassword, resetPassword
}


