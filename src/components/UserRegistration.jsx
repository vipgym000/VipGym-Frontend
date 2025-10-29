import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Card, Row, Col, Alert, Spinner, Image } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaCreditCard, FaReceipt, FaCamera, FaArrowLeft, FaArrowRight, FaCheck, FaUpload, FaVideo, FaVideoSlash, FaWhatsapp } from 'react-icons/fa';
import '../css/UserRegistration.css';

const UserRegistration = () => {
    const navigate = useNavigate();
    const [memberships, setMemberships] = useState([]);
    const [loading, setLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState('');
    const [errors, setErrors] = useState({});
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [imageSource, setImageSource] = useState('upload'); // 'upload' or 'camera'
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [apiError, setApiError] = useState('');
    const [stream, setStream] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [allFieldsValid, setAllFieldsValid] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        mobileNumber: '',
        dateOfBirth: '',
        joinDate: new Date().toISOString().split('T')[0],
        membershipId: '',
        totalFee: '',
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'CASH',
        remarks: '',
        status: 'ACTIVE',
        profilePicture: null
    });

    // Steps configuration
    const steps = [
        { id: 1, name: 'Personal Info', icon: <FaUser /> },
        { id: 2, name: 'Profile Picture', icon: <FaCamera /> },
        { id: 3, name: 'Membership', icon: <FaCreditCard /> },
        { id: 4, name: 'Payment', icon: <FaCreditCard /> },
        { id: 5, name: 'Review', icon: <FaCheck /> }
    ];

    // API base URL - adjust this to match your backend
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    // Detect if device is mobile
    useEffect(() => {
        const checkMobile = () => {
            const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
            const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
            setIsMobile(mobileRegex.test(userAgent));
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Fetch memberships on component mount
    useEffect(() => {
        fetchMemberships();
    }, []);

    // Cleanup camera stream on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Stop camera when leaving step 2
    useEffect(() => {
        if (currentStep !== 2 && stream) {
            stopCamera();
        }
    }, [currentStep, stream]);

    // Check if all required fields are filled
    useEffect(() => {
        const isValid = 
            formData.fullName.trim() !== '' &&
            formData.email.trim() !== '' &&
            formData.mobileNumber.trim() !== '' &&
            formData.dateOfBirth !== '' &&
            formData.joinDate !== '' &&
            formData.membershipId !== '' &&
            formData.totalFee !== '' &&
            formData.amount !== '' &&
            formData.paymentDate !== '';
        
        setAllFieldsValid(isValid);
    }, [formData]);

    const fetchMemberships = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/memberships/all`);
            if (response.ok) {
                const data = await response.json();
                setMemberships(data);
            } else {
                console.error('Failed to fetch memberships:', response.status);
                setApiError('Failed to load membership plans. Please check your connection.');
            }
        } catch (error) {
            console.error('Error fetching memberships:', error);
            setApiError('Server error while loading membership plans. Please try again later.');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleMembershipChange = (e) => {
        const membershipId = e.target.value;
        const selectedMembership = memberships.find(m => m.id === parseInt(membershipId));
        
        setFormData(prev => ({
            ...prev,
            membershipId,
            totalFee: selectedMembership ? selectedMembership.fee : ''
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            processImageFile(file);
        }
    };

    const handleCameraCapture = (e) => {
        const file = e.target.files[0];
        if (file) {
            processImageFile(file);
        }
    };

    const processImageFile = (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            setErrors(prev => ({ ...prev, profilePicture: 'Please select an image file' }));
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, profilePicture: 'Image size should be less than 5MB' }));
            return;
        }
        
        setFormData(prev => ({ ...prev, profilePicture: file }));
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewImage(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const startCamera = async () => {
        try {
            // Stop any previous stream before re-opening
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
            }

            setApiError('');
            if (isMobile) {
                if (cameraInputRef.current) cameraInputRef.current.click();
            } else {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false
                });
                setStream(mediaStream);
                if (videoRef.current) videoRef.current.srcObject = mediaStream;
                setCameraActive(true);
            }
        } catch (error) {
            console.error('Camera error:', error);
            setApiError('Unable to access camera. Check permissions or try again.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
                    processImageFile(file);
                    stopCamera();
                }
            }, 'image/jpeg', 0.95);
        }
    };

    const removeImage = () => {
        setPreviewImage(null);
        setFormData(prev => ({ ...prev, profilePicture: null }));
        setErrors(prev => ({ ...prev, profilePicture: '' }));
        // Reset file inputs
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    const validateStep = (step) => {
        const newErrors = {};
        
        if (step === 1) { // Personal Information
            if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
            if (!formData.email.trim()) {
                newErrors.email = 'Email is required';
            } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
                newErrors.email = 'Email is invalid';
            }
            if (!formData.mobileNumber.trim()) {
                newErrors.mobileNumber = 'Mobile number is required';
            } else if (!/^\d{10}$/.test(formData.mobileNumber.replace(/\D/g, ''))) {
                newErrors.mobileNumber = 'Mobile number must be 10 digits';
            }
            if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
            if (!formData.joinDate) newErrors.joinDate = 'Join date is required';
        } else if (step === 3) { // Membership
            if (!formData.membershipId) newErrors.membershipId = 'Please select a membership';
            if (!formData.totalFee || formData.totalFee <= 0) newErrors.totalFee = 'Total fee must be greater than 0';
        } else if (step === 4) { // Payment
            if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0';
            if (parseFloat(formData.amount) > parseFloat(formData.totalFee)) {
                newErrors.amount = 'Amount cannot exceed total fee';
            }
            if (!formData.paymentDate) newErrors.paymentDate = 'Payment date is required';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateAllSteps = () => {
        // Validate all steps before allowing submission
        const allValid = 
            validateStep(1) && 
            validateStep(3) && 
            validateStep(4);
        
        return allValid;
    };

    const nextStep = () => {
        const valid = validateStep(currentStep);
        if (!valid) {
            setApiError('Please fill all required fields before proceeding.');
            return;
        }
        setApiError('');
        if (!completedSteps.includes(currentStep)) {
            setCompletedSteps(prev => [...prev, currentStep]);
        }
        setCurrentStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    const prevStep = () => {
        setCurrentStep(currentStep - 1);
        window.scrollTo(0, 0);
    };

    const goToStep = (step) => {
        if (step < currentStep || completedSteps.includes(step)) {
            setCurrentStep(step);
        }
    };

    const calculateProgress = () => {
        return ((currentStep - 1) / (steps.length - 1)) * 100;
    };

    // WhatsApp sharing function
    const handleShareOnWhatsApp = () => {
        if (!receiptUrl || !formData.mobileNumber) {
            setApiError('Cannot share on WhatsApp: Missing receipt URL or mobile number');
            return;
        }
        
        // Clean the mobile number to ensure it's in the correct format
        const phoneNumber = formData.mobileNumber.replace(/\D/g, '');
        
        // Create a personalized message
        const message = `Hello ${formData.fullName},\n\nThank you for registering at VipGym! Your payment has been successfully processed.\n\nTo view your payment receipt, please click on this link: ${receiptUrl}\n\nIf you have any questions, please contact us.\n\nVipGym Team`;
        
        // Open WhatsApp with the pre-filled message
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        stopCamera();
        
        // Validate all steps before submission
        if (!validateAllSteps()) {
            setApiError('Please complete all required fields before submitting.');
            return;
        }
        
        setLoading(true);
        setIsSubmitting(true);
        setApiError('');
        
        try {
            const formDataToSend = new FormData();
            
            // Create a blob from the JSON string with proper content type
            const userBlob = new Blob([JSON.stringify({
                fullName: formData.fullName,
                email: formData.email,
                mobileNumber: formData.mobileNumber,
                dateOfBirth: formData.dateOfBirth,
                joinDate: formData.joinDate,
                membershipId: parseInt(formData.membershipId),
                totalFee: parseFloat(formData.totalFee),
                amount: parseFloat(formData.amount),
                paymentDate: formData.paymentDate,
                paymentMethod: formData.paymentMethod,
                remarks: formData.remarks,
                status: formData.status
            })], { type: 'application/json' });
            
            // Append the user data with proper content type
            formDataToSend.append('user', userBlob);
            
            // Add profile picture if selected
            if (formData.profilePicture) {
                formDataToSend.append('profilePicture', formData.profilePicture);
            }
            
            const response = await fetch(`${API_BASE_URL}/admin/users/register`, {
                method: 'POST',
                body: formDataToSend,
                // Don't set Content-Type header, let browser set it with boundary for FormData
            });
            
            // Check if response is OK before trying to parse JSON
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Server responded with status: ${response.status}`);
            }
            
            // Try to parse JSON, but handle potential errors
            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                throw new Error('Invalid response from server');
            }
            
            setRegistrationSuccess(true);
            setReceiptUrl(result.receiptUrl || '');
        } catch (error) {
            console.error('Registration error:', error);
            setApiError(error.message || 'Network error. Please try again.');
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };

    if (registrationSuccess) {
        return (
            <div className="user-registration">
                <div className="user-registration__register-container">
                    <div className="user-registration__brand-section">
                        <h1 className="user-registration__brand-title">VipGym</h1>
                        <p className="user-registration__brand-tagline">User Registration Complete</p>
                    </div>
                    
                    <div className="user-registration__success-content">
                        <div className="user-registration__success-icon">
                            <FaReceipt size={64} />
                        </div>
                        <h3 className="user-registration__success-title">Registration Successful!</h3>
                        <p className="user-registration__success-message">
                            User has been registered successfully and payment receipt has been generated.
                        </p>
                        {receiptUrl && (
                            <div className="user-registration__receipt-actions">
                                <Button 
                                    variant="primary" 
                                    href={receiptUrl} 
                                    target="_blank"
                                    className="me-2"
                                >
                                    <FaReceipt className="me-2" />
                                    View Receipt
                                </Button>
                                <Button 
                                    variant="success" 
                                    onClick={handleShareOnWhatsApp}
                                    className="me-2"
                                >
                                    <FaWhatsapp className="me-2" />
                                    Share on WhatsApp
                                </Button>
                                <Button 
                                    variant="outline-secondary" 
                                    href={receiptUrl} 
                                    download="receipt.png"
                                >
                                    Download Receipt
                                </Button>
                            </div>
                        )}
                        <div className="user-registration__form-actions">
                            <Button variant="primary" onClick={() => {
                                setRegistrationSuccess(false);
                                setCurrentStep(1);
                                setCompletedSteps([]);
                            }}>
                                Register Another User
                            </Button>
                            <Button variant="outline-secondary" onClick={() => navigate('/dashboard')}>
                                Back to Dashboard
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="user-registration">
            <div className="user-registration__register-container">
                <div className="user-registration__brand-section">
                    <h1 className="user-registration__brand-title">VipGym</h1>
                    <p className="user-registration__brand-tagline">User Registration</p>
                </div>
                
                <button className="user-registration__back-btn" onClick={() => navigate("/dashboard")}>
                    <FaArrowLeft className="me-2" />
                    Back to Dashboard
                </button>
                
                {/* Progress Indicator */}
                <div className="user-registration__progress-indicator">
                    {steps.map((step, index) => (
                        <div 
                            key={step.id} 
                            className={`user-registration__progress-step ${currentStep === step.id ? 'active' : ''} ${completedSteps.includes(step.id) ? 'completed' : ''}`}
                            onClick={() => goToStep(step.id)}
                        >
                            <div className="user-registration__progress-number">
                                {completedSteps.includes(step.id) ? <FaCheck /> : step.id}
                            </div>
                            <div className="user-registration__progress-label">{step.name}</div>
                            {index < steps.length - 1 && <div className="user-registration__progress-line"></div>}
                        </div>
                    ))}
                </div>
                
                {apiError && (
                    <div className="user-registration__error-message">{apiError}</div>
                )}
                
                <Form onSubmit={handleSubmit} className="user-registration__register-form">
                    {/* Step 1: Personal Information */}
                    {currentStep === 1 && (
                        <div className="user-registration__form-step">
                            <h2 className="user-registration__step-title">Personal Information</h2>
                            
                            <div className="user-registration__form-row">
                                <div className="user-registration__form-group">
                                    <label htmlFor="fullName">Full Name *</label>
                                    <input
                                        type="text"
                                        id="fullName"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        className={errors.fullName ? "user-registration__input-error" : ""}
                                        required
                                    />
                                    {errors.fullName && <div className="user-registration__field-error">{errors.fullName}</div>}
                                </div>
                                <div className="user-registration__form-group">
                                    <label htmlFor="email">Email *</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={errors.email ? "user-registration__input-error" : ""}
                                        required
                                    />
                                    {errors.email && <div className="user-registration__field-error">{errors.email}</div>}
                                </div>
                            </div>
                            
                            <div className="user-registration__form-row">
                                <div className="user-registration__form-group">
                                    <label htmlFor="mobileNumber">Mobile Number *</label>
                                    <input
                                        type="tel"
                                        id="mobileNumber"
                                        name="mobileNumber"
                                        value={formData.mobileNumber}
                                        onChange={handleInputChange}
                                        className={errors.mobileNumber ? "user-registration__input-error" : ""}
                                        required
                                    />
                                    {errors.mobileNumber && <div className="user-registration__field-error">{errors.mobileNumber}</div>}
                                </div>
                                <div className="user-registration__form-group">
                                    <label htmlFor="dateOfBirth">Date of Birth *</label>
                                    <input
                                        type="date"
                                        id="dateOfBirth"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
                                        onChange={handleInputChange}
                                        max={new Date().toISOString().split('T')[0]}
                                        className={errors.dateOfBirth ? "user-registration__input-error" : ""}
                                        required
                                    />
                                    {errors.dateOfBirth && <div className="user-registration__field-error">{errors.dateOfBirth}</div>}
                                </div>
                            </div>
                            
                            <div className="user-registration__form-row">
                                <div className="user-registration__form-group">
                                    <label htmlFor="joinDate">Join Date *</label>
                                    <input
                                        type="date"
                                        id="joinDate"
                                        name="joinDate"
                                        value={formData.joinDate}
                                        onChange={handleInputChange}
                                        className={errors.joinDate ? "user-registration__input-error" : ""}
                                        required
                                    />
                                    {errors.joinDate && <div className="user-registration__field-error">{errors.joinDate}</div>}
                                </div>
                                <div className="user-registration__form-group">
                                    <label htmlFor="status">Status</label>
                                    <div className="user-registration__select-wrapper">
                                        <select
                                            id="status"
                                            name="status"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                        <div className="user-registration__select-arrow">▼</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="user-registration__form-actions">
                                <button type="button" onClick={nextStep} className="user-registration__next-btn">
                                    Next Step
                                    <FaArrowRight className="ms-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Profile Picture */}
                    {currentStep === 2 && (
                        <div className="user-registration__form-step">
                            <h2 className="user-registration__step-title">Profile Picture</h2>
                            <p className="user-registration__step-subtitle">Choose how you'd like to add a profile picture (Optional)</p>
                            
                            {/* Image Source Selection */}
                            <div className="user-registration__image-source-tabs">
                                <button
                                    className={`user-registration__source-tab ${imageSource === 'upload' ? 'active' : ''}`}
                                    onClick={() => {
                                        setImageSource('upload');
                                        stopCamera();
                                    }}
                                >
                                    <FaUpload className="me-2" />
                                    Upload
                                </button>
                                <button
                                    className={`user-registration__source-tab ${imageSource === 'camera' ? 'active' : ''}`}
                                    onClick={() => {
                                        setImageSource('camera');
                                        if (cameraActive) {
                                            stopCamera();
                                        }
                                    }}
                                >
                                    <FaCamera className="me-2" />
                                    Camera
                                </button>
                            </div>

                            {/* Upload Option */}
                            {imageSource === 'upload' && (
                                <div className="user-registration__upload-section">
                                    <div className="user-registration__upload-area" onClick={() => fileInputRef.current.click()}>
                                        {previewImage ? (
                                            <div className="user-registration__image-preview">
                                                <Image 
                                                    src={previewImage} 
                                                    alt="Profile preview" 
                                                    roundedCircle
                                                />
                                                <div className="user-registration__image-overlay">
                                                    <FaCamera />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="user-registration__upload-placeholder">
                                                <FaUpload size={48} />
                                                <p>Click to upload image</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="user-registration__upload-controls">
                                        <input
                                            ref={fileInputRef}
                                            id="profilePicture"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="user-registration__file-input"
                                        />
                                        {errors.profilePicture && <div className="user-registration__field-error">{errors.profilePicture}</div>}
                                        <p className="user-registration__upload-hint">Max file size: 5MB. Supported formats: JPG, PNG, GIF</p>
                                    </div>
                                </div>
                            )}

                            {/* Camera Option */}
                            {imageSource === 'camera' && (
                                <div className="user-registration__camera-section">
                                    {!cameraActive ? (
                                        <div className="user-registration__upload-area" onClick={startCamera}>
                                            {previewImage ? (
                                                <div className="user-registration__image-preview">
                                                    <Image 
                                                        src={previewImage} 
                                                        alt="Profile preview" 
                                                        roundedCircle
                                                    />
                                                    <div className="user-registration__image-overlay">
                                                        <FaCamera />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="user-registration__upload-placeholder">
                                                    <FaCamera size={48} />
                                                    <p>Click to {isMobile ? 'open camera app' : 'start camera'}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="user-registration__camera-container">
                                            <div className="user-registration__camera-video-container">
                                                <video 
                                                    ref={videoRef} 
                                                    autoPlay 
                                                    playsInline
                                                    className="user-registration__camera-video"
                                                />
                                            </div>
                                            <div className="user-registration__camera-controls">
                                                <button 
                                                    type="button" 
                                                    onClick={capturePhoto}
                                                    className="user-registration__capture-btn"
                                                >
                                                    <FaCamera className="me-2" />
                                                    Capture Photo
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={stopCamera}
                                                    className="user-registration__cancel-btn"
                                                >
                                                    <FaVideoSlash className="me-2" />
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="user-registration__upload-controls">
                                        <input
                                            ref={cameraInputRef}
                                            id="cameraCapture"
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleCameraCapture}
                                            className="user-registration__file-input"
                                        />
                                        {errors.profilePicture && <div className="user-registration__field-error">{errors.profilePicture}</div>}
                                        <p className="user-registration__upload-hint">
                                            {isMobile ? 'Opens your camera app' : 'Uses your browser camera access'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Remove Image Button */}
                            {previewImage && (
                                <div className="user-registration__remove-image-container">
                                    <button 
                                        type="button" 
                                        onClick={removeImage}
                                        className="user-registration__remove-image-btn"
                                    >
                                        Remove Image
                                    </button>
                                </div>
                            )}
                            
                            <div className="user-registration__form-actions">
                                <button type="button" onClick={prevStep} className="user-registration__prev-btn">
                                    <FaArrowLeft className="me-2" />
                                    Previous
                                </button>
                                <button type="button" onClick={nextStep} className="user-registration__next-btn">
                                    Next Step
                                    <FaArrowRight className="ms-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Membership */}
                    {currentStep === 3 && (
                        <div className="user-registration__form-step">
                            <h2 className="user-registration__step-title">Membership Details</h2>
                            <p className="user-registration__step-subtitle">Select the membership plan for this user</p>
                            
                            {memberships.length > 0 ? (
                                <>
                                    <div className="user-registration__membership-plans">
                                        {memberships.map((membership) => (
                                            <div
                                                key={membership.id}
                                                className={`user-registration__membership-card ${
                                                    formData.membershipId === membership.id.toString() ? 'selected' : ''
                                                }`}
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        membershipId: membership.id.toString(),
                                                        totalFee: membership.fee
                                                    }));
                                                    if (errors.membershipId) {
                                                        setErrors(prev => ({ ...prev, membershipId: "" }));
                                                    }
                                                }}
                                            >
                                                <div className="user-registration__membership-header">
                                                    <h3>{membership.name}</h3>
                                                    <div className="user-registration__membership-price">${membership.fee}</div>
                                                </div>
                                                <div className="user-registration__membership-details">
                                                    <p>Duration: {membership.durationInMonths} months</p>
                                                    <p>Plan ID: {membership.id}</p>
                                                    <p>{membership.description || "Standard membership with full gym access"}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {errors.membershipId && <div className="user-registration__field-error">{errors.membershipId}</div>}
                                    
                                    {formData.totalFee && (
                                        <div className="user-registration__selected-plan">
                                            <h4>Total Fee: ${formData.totalFee}</h4>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="user-registration__loading-memberships">
                                    <Spinner animation="border" role="status">
                                        <span className="visually-hidden">Loading membership plans...</span>
                                    </Spinner>
                                    <p>Loading membership plans...</p>
                                </div>
                            )}
                            
                            <div className="user-registration__form-actions">
                                <button type="button" onClick={prevStep} className="user-registration__prev-btn">
                                    <FaArrowLeft className="me-2" />
                                    Previous
                                </button>
                                <button type="button" onClick={nextStep} className="user-registration__next-btn">
                                    Next Step
                                    <FaArrowRight className="ms-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Payment */}
                    {currentStep === 4 && (
                        <div className="user-registration__form-step">
                            <h2 className="user-registration__step-title">Payment Information</h2>
                            
                            <div className="user-registration__form-row">
                                <div className="user-registration__form-group">
                                    <label htmlFor="amount">Payment Amount *</label>
                                    <input
                                        type="number"
                                        id="amount"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className={errors.amount ? "user-registration__input-error" : ""}
                                        required
                                    />
                                    {errors.amount && <div className="user-registration__field-error">{errors.amount}</div>}
                                </div>
                                <div className="user-registration__form-group">
                                    <label htmlFor="paymentDate">Payment Date *</label>
                                    <input
                                        type="date"
                                        id="paymentDate"
                                        name="paymentDate"
                                        value={formData.paymentDate}
                                        onChange={handleInputChange}
                                        className={errors.paymentDate ? "user-registration__input-error" : ""}
                                        required
                                    />
                                    {errors.paymentDate && <div className="user-registration__field-error">{errors.paymentDate}</div>}
                                </div>
                            </div>
                            
                            <div className="user-registration__form-row">
                                <div className="user-registration__form-group">
                                    <label htmlFor="paymentMethod">Payment Method</label>
                                    <div className="user-registration__select-wrapper">
                                        <select
                                            id="paymentMethod"
                                            name="paymentMethod"
                                            value={formData.paymentMethod}
                                            onChange={handleInputChange}
                                        >
                                            <option value="CASH">Cash</option>
                                            <option value="CARD">Card</option>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                            <option value="UPI">UPI</option>
                                            <option value="CHEQUE">Cheque</option>
                                        </select>
                                        <div className="user-registration__select-arrow">▼</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="user-registration__form-row">
                                <div className="user-registration__form-group full-width">
                                    <label htmlFor="remarks">Remarks (Optional)</label>
                                    <textarea
                                        id="remarks"
                                        name="remarks"
                                        value={formData.remarks}
                                        onChange={handleInputChange}
                                        rows={3}
                                        placeholder="Add any additional notes..."
                                    />
                                </div>
                            </div>
                            
                            <div className="user-registration__form-actions">
                                <button type="button" onClick={prevStep} className="user-registration__prev-btn">
                                    <FaArrowLeft className="me-2" />
                                    Previous
                                </button>
                                <button type="button" onClick={nextStep} className="user-registration__next-btn">
                                    Next Step
                                    <FaArrowRight className="ms-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Review */}
                    {currentStep === 5 && (
                        <div className="user-registration__form-step">
                            <h2 className="user-registration__step-title">Review Information</h2>
                            <p className="user-registration__step-subtitle">Please review all the information before submitting</p>
                            
                            <div className="user-registration__review-sections">
                                <div className="user-registration__review-section">
                                    <h3>Personal Information</h3>
                                    <div className="user-registration__review-grid">
                                        <div className="user-registration__review-item">
                                            <span className="user-registration__review-label">Name:</span>
                                            <span className="user-registration__review-value">{formData.fullName}</span>
                                        </div>
                                        <div className="user-registration__review-item">
                                            <span className="user-registration__review-label">Email:</span>
                                            <span className="user-registration__review-value">{formData.email}</span>
                                        </div>
                                        <div className="user-registration__review-item">
                                            <span className="user-registration__review-label">Mobile:</span>
                                            <span className="user-registration__review-value">{formData.mobileNumber}</span>
                                        </div>
                                        <div className="user-registration__review-item">
                                            <span className="user-registration__review-label">Date of Birth:</span>
                                            <span className="user-registration__review-value">{formData.dateOfBirth}</span>
                                        </div>
                                        <div className="user-registration__review-item">
                                            <span className="user-registration__review-label">Join Date:</span>
                                            <span className="user-registration__review-value">{formData.joinDate}</span>
                                        </div>
                                        <div className="user-registration__review-item">
                                            <span className="user-registration__review-label">Status:</span>
                                            <span className="user-registration__review-value">{formData.status}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="user-registration__review-section">
                                    <h3>Membership & Payment</h3>
                                    <div className="user-registration__review-grid">
                                        <div className="user-registration__review-item">
                                            <span className="user-registration__review-label">Membership:</span>
                                            <span className="user-registration__review-value">
                                                {memberships.find(m => m.id === parseInt(formData.membershipId))?.name || 'Not selected'}
                                            </span>
                                        </div>
                                        <div className="user-registration__review-item">
                                            <span className="user-registration__review-label">Duration:</span>
                                            <span className="user-registration__review-value">
                                                {memberships.find(m => m.id === parseInt(formData.membershipId))?.durationInMonths || '0'} months
                                            </span>
                                        </div>
                                        <div className="user-registration__review-item">
                                            <span className="user-registration__review-label">Total Fee:</span>
                                            <span className="user-registration__review-value">${formData.totalFee}</span>
                                        </div>
                                        <div className="user-registration__review-item">
                                            <span className="user-registration__review-label">Payment Amount:</span>
                                            <span className="user-registration__review-value">${formData.amount}</span>
                                        </div>
                                        <div className="user-registration__review-item">
                                            <span className="user-registration__review-label">Payment Date:</span>
                                            <span className="user-registration__review-value">{formData.paymentDate}</span>
                                        </div>
                                        <div className="user-registration__review-item">
                                            <span className="user-registration__review-label">Payment Method:</span>
                                            <span className="user-registration__review-value">{formData.paymentMethod}</span>
                                        </div>
                                        {formData.remarks && (
                                            <div className="user-registration__review-item full-width">
                                                <span className="user-registration__review-label">Remarks:</span>
                                                <span className="user-registration__review-value">{formData.remarks}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {previewImage && (
                                    <div className="user-registration__review-section">
                                        <h3>Profile Picture</h3>
                                        <div className="user-registration__review-image">
                                            <Image 
                                                src={previewImage} 
                                                alt="Profile preview" 
                                                roundedCircle
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Validation Warning */}
                            {!allFieldsValid && (
                                <Alert variant="warning" className="mt-3">
                                    Please ensure all required fields are filled before submitting.
                                </Alert>
                            )}
                            
                            <div className="user-registration__form-actions">
                                <button type="button" onClick={prevStep} className="user-registration__prev-btn">
                                    <FaArrowLeft className="me-2" />
                                    Previous
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={loading || !allFieldsValid || isSubmitting} 
                                    className="user-registration__submit-btn"
                                >
                                    {loading ? (
                                        <>
                                            <Spinner as="span" animation="border" size="sm" />
                                            <span className="ms-2">Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaUser className="me-2" />
                                            Register User
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </Form>
                
                {loading && (
                    <div className="user-registration__loading-overlay">
                        <div className="user-registration__loading-spinner"></div>
                        <p>Creating user account...</p>
                    </div>
                )}

                {/* Hidden canvas for photo capture */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
        </div>
    );
};

export default UserRegistration;