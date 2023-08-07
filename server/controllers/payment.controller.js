import User from "../models/user.model.js"
import { razorpay } from "../server.js"
import AppError from "../utils/error.util.js"
import crypto from 'crypto'

export const getRazorpayApiKey = async (req, res, next) => {
    res.status(200).json({
        success: true,
        message: 'Razorpay API key',
        key: process.env.RAZORPAY_KEY_ID
    })
}

export const buySubscription = async (req, res, next) => {
    const { id } = req.user 
    const user = await User.findById(id)

    if(!user){
        return next(new AppError('Unauthorized, please login '))
    }

    //admin can't buy a subscription
    if(user.role == 'ADMIN'){
        return next(new AppError('Admin can not purchase a subscription'))
    }

    //creating a subscription in razorpay

    const subscription = await razorpay.subscriptions.create({
        plan_id: process.env.RAZORPAY_PLAN_ID,
        customer_notify: 1 //gives notification to customer
    })

    //storing information
    user.subscription.id = subscription.id
    user.subscription.status = subscription.status

    await user.save()

    res.status(200).json({
        success: true,
        message: 'Subscribed successfully',
        subscription_id: subscription.id
    })
}

export const verifySubscription = async (req, res, next) => {
    const { id } = req.user 
    const { razorpay_payment_id, razorpay_signature, razorpay_subscription_id } = req.body

    const user = await User.findById(id)

    if(!user){
        return next(new AppError('Unauthorized, please login '))
    }

    const subscriptionId = user.subscription.id 

    const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_SECRET)
        .update(`${razorpay_payment_id}|${subscriptionId}`)
        .digest('hex')

    //payment is successful or not
    if( generatedSignature !== razorpay_signature ){
        return next(new AppError('Payment is not verified, please try again', 500))
    }

    await Payment.create({
        razorpay_payment_id, 
        razorpay_signature,
        razorpay_subscription_id
    })

    user.subscription.status = 'active' //earlier it was pending 
    await user.save()

    res.status(200).json({
        success: true,
        message: 'Payment verified successfully'
    })
}

export const cancelSubscription = async (req, res, next) => {

}

export const allPayments = async (req, res, next) => {

}