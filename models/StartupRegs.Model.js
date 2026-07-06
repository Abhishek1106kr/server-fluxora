import mongoose from "mongoose";

const StartUpRegSchema=new mongoose.Schema({
    StartupId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',//the one who registerd the startup
        required:true
    },
    StartUpName:{type:String , required:true},
    legalName:{
        type:String, 
        required:true,
        trim:true
    },
    WebSiteUrl:{
        type:String,
        trim:true,
        required:true
    },
    Category:{
        type:String,
        enum:[
            'technology',
            'fintech',
            'healthcare',
            'edtech',
            'food',
            'agriculture',
            'entertainment',
            'other'
        ],
        trim:true,
        required:true
    },
    onLineDescription:{
        type:String,
        trim:true
    },
    fullDescription:{
        type:String,
        trim:true
    },
    employeeCountRange:{
        type:String,
        enum:[
            '1-10',
            '11-50',
            '51-200',
            '200-1000',
            '1000+'
        ],
        trim:true,
        required:true
    },
    inCorporationDate:{
        type:Date,
        required:true
    },
    logoURL:{
        type:String
    },
    registerationStatus:{
        type:String,
        default:'pending',
        enum:[
            'pending',
            'approved',
            'rejected'
        ]
    },
    rejectionReason:{
        type:String,
        trim:true
    },
    country:{
        type:String,
        required:true,
        trim:true
    },
    state:{
        type:String,
        required:true,
        trim:true
    },
    city:{
        type:String,
        required:true,
        trim:true
    },
    address:{
        type:String,
        required:true,
        trim:true
    },
    fundingRound:{
        stage: {
            type:String,
            trim:true,
            enum:[
                'pre-seed',
                'seed',
                'series A',
                'series B',
                'series C',
                'series D',
                'series E',
                'series F',
                'series G',
                'series H',
                'series I',
                'series J',
                'other'
            ]
        },
        totalRaise:{
            type:Number,
            default:0
        },
        targetRaised:{
            type:Number,
        },
        pitchDeckULR:{
            type:String
        }
    },
    socialLinks:{
        linkedin: String,
        twitter: String,
        github: String,
        crunchbase: String,
        pitchVideo: String
    }
}, {
    timestamps:true
});

const StartUpRegModel = mongoose.models.StartUp || mongoose.model("StartUp", StartUpRegSchema);

export default StartUpRegModel;
