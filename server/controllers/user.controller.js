import User from "../models/user.model.js"
import AppError from "../utils/error.util.js"
import cloudinary from 'cloudinary';
import fs from 'fs/promises'
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto"

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
    console.log(resetPasswordURL)

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

const resetPassword = async (req, res, next) => {
    const { resetToken } = req.params

    const { password } = req.body 

    //we haven't stored plain password in database
    const forgotPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')
    
    //checking whether this token is of any user or not
    const user = await User.findOne({
        forgotPasswordToken,
        forgotPasswordExpiry: { $gt: Date.now() }
    })

    if(!user){
        return next(new AppError('Token is invalid or expired, please try again', 400))    
    }

    user.password = password
    user.forgotPasswordToken = undefined 
    user.forgotPasswordExpiry = undefined

    user.save()

    res.status(200).json({
        success: true,
        message: 'Password changed successfully!'
    })
}

const changePassword = async (req, res, next) => {
    const { oldPassword, newPassword } = req.body
    const { id } = req.user

    if(!oldPassword || !newPassword){
        return next(new AppError('All fields are mandatory', 500))    
    }

    const user = await User.findById(id).select('+password')

    if(!user){
        return next(new AppError('User does not exist', 400))    
    }

    //comparing entered oldPassword and password in database 
    const isPasswordValid = await user.comparePassword(oldPassword);

    if(!isPasswordValid){
        return next(new AppError('Old Password is invalid', 400))    
    }

    user.password = newPassword 
    await user.save()

    user.password = undefined 

    res.status(200).json({
        success: true,
        message: 'Password changed successfully'
    })
}

const updateUser = async(req, res, next) => {
    const { fullName } = req.body 
    const { id } = req.user.id 

    const user = await User.findById(id)

    if(!user) {
        return next(new AppError('User does not exists', 400))    
    }

    if(req.fullName){
        user.fullName = fullName
    }

    //if user has updated the image

    if(req.file){
        //deleting the image which is there in existing public id 
        await cloudinary.v2.uploader.destroy(user.avatar.public_id)

        //upload it back
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

    res.status(200).json({
        success: true,
        message: 'Details updated successfully'
    })

}
export {
    register, login, logout, getProfile, forgotPassword, resetPassword, changePassword, updateUser
}


