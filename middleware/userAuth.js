import jwt from 'jsonwebtoken';



const userAuth=async(req,res,next)=>{
    let token=req.cookies.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (token === "null" || token === "undefined") {
        token = null;
    }

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
            // Support both req.body.userId and req.userId for controller convenience
            req.userId = decodedToken.id;
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