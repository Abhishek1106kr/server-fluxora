import mongoose from 'mongoose';

export const StartupSchema=new mongoose.Schema({
    companyName:{type:String,required:true},
    motto:{type:String},
    logoUrl:{type:String,default:""},
    //lcation parameters for local matching
    location:{
        city:{type:String, required:true},
        area:{type:String},
        country:{type:String}
    },
    hrContact:{
        managerName:{
            type:String,default:"HR Team",

        },
        email:{type:String,required:true},
        linkedin:{type:String,default:""},
        careersPage:{type:String,default:""}
    },
    ownerId:{type:mongoose.Schema.Types.ObjectId,ref:'User', required:true},




},{timestamps:true}
);


//Index city and area to keep location lookups increadibly fast

StartupSchema.index({"location.city":1,
    "location.area"
    :1
});
export default mongoose.models.Startup || mongoose.model("Startup", StartupSchema, "localstartups");
