import { Schema, model } from "mongoose";

const userSchema = new Schema({
    fullName: {
        type: 'String',
        required: [true,'Name is required'],
        minLength: [5,'Name must be at least 5 characters'],
        maxLength: [50, 'Name must be less than 50 characters'],
        lowercase: true, 
        trim: true,
    },
    email: {
        type: 'String',
        required: [true,'Email is required'],
        lowercase: true, 
        trim: true,
        unique: true,
        match: [/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g, 'Please enter a valid email address']
    },
    password: {
        type: 'String',
        required: [true,'Password is required'],
        minLength: [8,'Name must be at least 8 characters'],
        select: false
    },
    avatar: {
        public_id:{
            type: 'String'
        },
        secure_url:{
            type:'String'
        }
    },
    role:{
        type: 'String',
        enum: ['USER','ADMIN'],
        default:'USER'
    },
    forgotPasswordToken: String,
    forgotPasswordExpiry: Date
},{
    timestamps: true
})

const User = model('User', userSchema)

export default User