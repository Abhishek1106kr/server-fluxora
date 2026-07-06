import mongoose from 'moongoose';


const assessmentSchema=new mongoose.Schema(
    {
        roleTarget:{type:String,required:true, unique:true},
        timeLimitMinutes:{
            type:Number,default:30
        },
        question:[{
            questionId:{type:String, required:true},
            questionText:{type:String,required:true},
            options:[{type:String, required:true}],
            correctOptionIndex:{type:Number,required:true},
            

      }  ],
        totalScore:{type:Number,required:true,default:0}
       

    },
    {timestamps:true}
);

export default mongoose.model("Assessment",assessmentSchema);
