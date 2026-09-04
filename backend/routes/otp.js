const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

let generatedOTP = null;


router.post("/send-otp", async (req, res) => {

    const { email } = req.body;

    generatedOTP = Math.floor(100000 + Math.random() * 900000);


    let transporter = nodemailer.createTransport({

        service: "gmail",

        auth: {
            user: "yourgmail@gmail.com",
            pass: "your-app-password"
        }

    });


    await transporter.sendMail({

        from: "yourgmail@gmail.com",
        to: email,
        subject: "Faculty Management Login OTP",
        text: `Your OTP is ${generatedOTP}`

    });


    res.json({
        message: "OTP sent successfully"
    });

});


router.post("/verify-otp", (req, res) => {

    const { otp } = req.body;


    if (otp == generatedOTP) {

        res.json({
            success: true,
            message: "OTP Verified"
        });

    }
    else {

        res.json({
            success: false,
            message: "Invalid OTP"
        });

    }

});


module.exports = router;