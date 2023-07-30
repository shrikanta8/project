import Course from "../models/course.model.js"
import AppError from "../utils/error.util.js"

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

export {
    getAllCourses, getLecturesByCourseId
}