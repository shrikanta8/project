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

const updateCourse = async (req, res, next) => {
    try {
        const { id } = req.params 
        const course = await Course.findByIdAndUpdate(
            id,
            {
                $set: req.body 
            },
            {
                runValidators: true //validates our data
            }
        )
        // console.log('course > ', course)
        if(!course) {
            return next(new AppError('Course does not exists', 500))    
        }

        res.status(200).json({
            success: true,
            message: 'Course updated successfully!',
            course
        })
    } catch (e) {
        return next(new AppError(e.message, 500))    
    }
}

const removeCourse = async (req, res, next) => {
    try {
        const { id } = req.params

        const course = await Course.findById(id)

        if(!course) {
            return next(new AppError('Course does not exists', 500))    
        }

        await Course.findByIdAndDelete(id)
        res.status(200).json({
            success: true,
            message: 'Course deleted successfully!',
        })
    } catch (e) {
        return next(new AppError(e.message, 500))    
    }
}

const addLectureToCourseById = async (req, res, next) => {

    try {
        const { title, description } = req.body 
        const { id } = req.params 

        if(!title || !description ){
            return next(new AppError('All fields are required', 400))    
        }

        const course = await Course.findById(id)

        if(!course){
            return next(new AppError('Course does not exist', 500))    
        }

        const lectureData = {
            title,
            description,
            lecture: {} 
        }

        if(req.file){
            try {
                const result = await cloudinary.v2.uploader.upload(req.file.path, {
                    folder: 'lms'
                })
                console.log(JSON.stringify(result))
                if(result){
                    lectureData.lecture.public_id = result.public_id;
                    lectureData.lecture.secure_url = result.secure_url
                }
        
                fs.rm(`uploads/${req.file.filename}`)
            } catch (e) {
                return next(new AppError(e.message, 500))    
            }
        }

        console.log('lecture > ', JSON.stringify(lectureData))
        course.lectures.push(lectureData)

        course.numberOfLectures = course.lectures.length 
        await course.save() 

        res.status(200).json({
            success: true,
            message: 'Lecture is added successfully ',
            course,
        })
    } catch (e) {
        return next(new AppError(e.message, 500))    
    }
}


export {
    getAllCourses, getLecturesByCourseId, createCourse, updateCourse, removeCourse, addLectureToCourseById
}