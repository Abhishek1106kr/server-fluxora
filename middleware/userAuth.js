import jwt from 'jsonwebtoken';



const userAuth=async(req,res,next)=>{
    const token=req.cookies.token;

    if(!token){
        return res.json({success:false,message:"unauthorised"})
    }
    try {
        const decodedToken=jwt.verify(token,process.env.JWT_SECRET);
        if(decodedToken.id){
            if (!req.body) {
                req.body = {};
            }
            req.body.userId= decodedToken.id;
            next();
        }
        else{
            return res.json({success:false,message:"invalid token"});
        }
    } catch (error) {
        return res.json({success:false,message:error.message})
    }
}
export default userAuth;