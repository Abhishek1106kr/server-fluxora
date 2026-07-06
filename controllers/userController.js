
import userModel from "../models/userModel.js";



export const getUserData=async(req,res)=>{
    const {userId}=req.body || {};
    try {
        const user=await userModel.findById(userId);
        if(!user){
            return res.json({success:false,message:"Invalid User"});
        }
        res.json({
            success:true,
            user:{
                name:user.name,
                email:user.email,
                username:user.username,
                _id:user._id,
                isAccountVerified:user.isAccountVerified,//true or false
                role:user.role,
            }
        })

        
    } catch (error) {
        return res.json({success:false, message:error.message});
    }


}
