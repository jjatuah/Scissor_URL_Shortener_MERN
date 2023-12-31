const jwt = require("jsonwebtoken");
require('dotenv').config();


const tokenGenerator = async (id, email) => {
  try {
    let generatedToken = jwt.sign({id : id, email: email}, process.env.SECRET_KEY, { expiresIn: "1d"});
    return generatedToken
  } catch (error) {
    console.log(error);
  }
}

module.exports = tokenGenerator;