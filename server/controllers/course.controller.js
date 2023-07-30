import Course from "../models/course.model.js"
import AppError from "../utils/error.util.js"
import fs from 'fs/promises'
import cloudinary from 'cloudinary';

const getAllCourses = async function(req, res, next) {
    try {
        const courses = await Course.find({}).select('-lectures')

        res.status(200).json({
            success: true,
            message: 'All courses',
            courses,
        })
    } catch (e) {
        return next(new AppError(e.message, 500))    
    }
} 

const getLecturesByCourseId = async function(req, res, next) {
    try {
        const { id } = req.params
        console.log('course id > ',id)
        const course = await Course.findById(id)
        console.log('course details > ',course)

        if(!course){
            return next(new AppError('Invalid course id', 400))    
        }

        res.status(200).json({
            success: true,
            message: 'Course lectures fetched successfully',
            lectures: courses.lectures
        })
    } catch (e) {
        return next(new AppError(e.message, 500))    
    }
}

const createCourse = async (req, res, next) => {
    const { title, description, category, createdBy } = req.body

    if(!title || !description || !category || !createdBy){
        return next(new AppError('All fields are required', 400))    
    }

    const course = await Course.create({
        title, 
        description, 
        category, 
        createdBy, 
        thumbnail: {
            public_id: 'Dummy',     //just giving some dummy value as it is set to required in schema
            secure_url: 'Dummy',
        }
    })

    if(!course){
        return next(new AppError('Course not created, please try again', 500))    
    }

    if(req.file){
        try {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'lms'
            })
            console.log(JSON.stringify(result))
            if(result){
                course.thumbnail.public_id = result.public_id;
                course.thumbnail.secure_url = result.secure_url
            }
    
            fs.rm(`uploads/${req.file.filename}`)
        } catch (e) {
        return next(new AppError(e.message, 500))    
        }
    }

    await course.save()

    res.status(200).json({
        success: true,
        message: 'Course created successfully',
        course,
    })
}

const updateCourse = (req, res, next) => {

}

const removeCourse = (req, res, next) => {

}

export {
    getAllCourses, getLecturesByCourseId, createCourse, updateCourse, removeCourse
}