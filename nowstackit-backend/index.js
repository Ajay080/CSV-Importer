const express = require('express');
const bodyParser = require('body-parser');
const cors= require('cors');
const userRouter=require('./routers/user')

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(userRouter)
app.use('/uploads', express.static('uploads'));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});