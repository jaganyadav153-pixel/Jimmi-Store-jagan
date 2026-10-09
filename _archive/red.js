// Demo OTP (in real project, backend generates OTP)
let generatedOTP = "";

function sendOTP() {
  let roll = document.getElementById("roll").value;
  if (roll === "") {
    alert("Please enter your Roll Number / Phone");
    return;
  }
  // Generate random 4-digit OTP
  generatedOTP = Math.floor(1000 + Math.random() * 9000).toString();
  alert("OTP sent to " + roll + ": " + generatedOTP); // Demo only
  document.getElementById("otpForm").style.display = "block";
}

function verifyOTP() {
  let otp = document.getElementById("otp").value;
  if (otp === generatedOTP) {
    document.getElementById("result").innerHTML = "<h3>✅ Login Successful! Welcome Student</h3>";
  } else {
    document.getElementById("result").innerHTML = "<h3>❌ Invalid OTP. Try again.</h3>";
  }
}
