import { useState } from "react";
import "./Register.css";
import FormInput from "../../components/form_input/FormInput";
import { Link } from "react-router-dom";
import axios from "axios";
import { useNavigate } from 'react-router-dom';

const Register = () => {

  const navigate = useNavigate();

  const [values, setValues] = useState({
    email:"",
    password:"",
    confirmPassword:""
  });

  const [mailError, setMailError] = useState(false)
  const [mailText, setMailText] = useState("")
  
  const inputs = [ 
    {
      id:1,
      name:"email",
      type:"email",
      placeholder:"Email",
      label:"Email",
      errorMessage:"Please enter a valid email address",
      required: true
    },
    {
      id:2,
      name:"password",
      type:"password",
      placeholder:"password",
      label:"password",
      errorMessage:"Password must be at least 8 characters long and should include a number",
      pattern: "^(?=.*\\d).{8,}$",
      required: true
    },
    {
      id:3,
      name:"confirmPassword",
      type:"password",
      placeholder:"confirm password",
      label:"confirm password",
      errorMessage:"Passwords don't match",
      pattern: values.password,
      required: true
    }  
  ]

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Make the Axios POST request here
    await axios.post('https://short-3u0c.onrender.com/register', values)
      .then(response => {
        if (response.data == "User already exists. Proceed to login") {
          setMailError(true)
          setMailText(response.data)
        } else {
          const token = response.data.token;

          localStorage.setItem('token', token);

          navigate('/')
        }
      })
      .catch(error => {
        // Handle the error;
      });
  };

  const onChange = (e) => {
    setValues({...values, [e.target.name]: e.target.value});
  }


  return ( 
    <div className="register">
      <div className="top">
        <h1>SCISSOR</h1>
        <Link to="/login">Sign In</Link>
      </div>

      {mailError && <div className="error">
        <p>{mailText}</p>
      </div>}

      <form onSubmit={handleSubmit}>
        <h2>Signup to Scissor</h2>
        <p>We'll cut that URL short</p>
        {inputs.map((input) => (
          <FormInput key={input.id} {...input} value = {values[input.name]} onChange={onChange}/>
        ))}
        <button type="submit">Register</button>
      </form>
    </div>
   );
}
 
export default Register; 