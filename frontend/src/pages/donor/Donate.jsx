import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { donationAPI, uploadAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import OtpModal from '../../components/OtpModal';
import Layout from '../../components/Layout';

const Donate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [showOtp, setShowOtp] = useState(false);
  const [formData, setFormData] = useState({
    foodType: 'veg', category: 'cooked', description: '',
    quantityValue: '', quantityUnit: 'meals',
    prepTime: '', expiryTime: '',
    pickupAddress: '', city: '', preferredPickupTime: '',
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const buildDonationData = (imageUrls = []) => ({
    type: 'food',
    pickupLocation: { address: formData.pickupAddress, city: formData.city },
    preferredPickupTime: formData.preferredPickupTime,
    images: imageUrls.map((url, i) => ({ originalname: uploadedImages[i]?.name || `image_${i}.jpg`, url })),
    foodDetails: {
      foodType: formData.foodType, category: formData.category,
      description: formData.description,
      quantity: { value: parseInt(formData.quantityValue), unit: formData.quantityUnit },
      preparationTime: formData.prepTime, expiryTime: formData.expiryTime,
    }
  });

  const handleSubmit = (e) => { e.preventDefault(); setShowOtp(true); };

  const uploadToS3 = async (file) => {
    try {
      const { data } = await uploadAPI.getPresignedUrl(file.name, file.type);
      await fetch(data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      return data.fileUrl;
    } catch (err) {
      console.error('S3 upload failed:', err);
      return null;
    }
  };

  const handleOtpVerified = async () => {
    setShowOtp(false);
    setLoading(true);
    try {
      let imageUrls = [];
      if (uploadedImages.length > 0) {
        const results = await Promise.all(uploadedImages.map(img => uploadToS3(img.file)));
        imageUrls = results.filter(Boolean);
      }
      await donationAPI.create(buildDonationData(imageUrls));
      navigate('/donor/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({ file, name: file.name, preview: URL.createObjectURL(file) }));
    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(uploadedImages[index].preview);
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const Field = ({ label, children }) => (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-2">{label}</label>
      {children}
    </div>
  );

  return (
    <Layout title="New Donation">
      <div className="max-w-2xl mx-auto">
        {/* Header card */}
        <div className="glass-card stat-green mb-6">
          <h2 className="text-xl font-bold text-white mb-1">Share Your Surplus Food</h2>
          <p className="text-white/60 text-sm">Fill in the details below. Your donation will be matched with nearby NGOs and volunteers.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Food Details */}
          <div className="glass-card">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">Food Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Food Type">
                  <select name="foodType" value={formData.foodType} onChange={handleChange} className="glass-select" required>
                    <option value="veg">Vegetarian</option>
                    <option value="non-veg">Non-Vegetarian</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </Field>
                <Field label="Category">
                  <select name="category" value={formData.category} onChange={handleChange} className="glass-select" required>
                    <option value="cooked">Cooked</option>
                    <option value="packaged">Packaged</option>
                    <option value="raw">Raw</option>
                  </select>
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="glass-input resize-none"
                  placeholder="Describe the food items, portions, allergens..."
                  rows={3}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Quantity">
                  <input type="number" name="quantityValue" value={formData.quantityValue} onChange={handleChange} className="glass-input" placeholder="Amount" required />
                </Field>
                <Field label="Unit">
                  <select name="quantityUnit" value={formData.quantityUnit} onChange={handleChange} className="glass-select">
                    <option value="meals">Meals</option>
                    <option value="kg">Kilograms</option>
                    <option value="items">Items</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Preparation Time">
                  <input type="datetime-local" name="prepTime" value={formData.prepTime} onChange={handleChange} className="glass-input" required />
                </Field>
                <Field label="Expiry Time">
                  <input type="datetime-local" name="expiryTime" value={formData.expiryTime} onChange={handleChange} className="glass-input" required />
                </Field>
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="glass-card">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">Photos (Optional)</h3>
            <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl cursor-pointer transition-all" style={{ border: '2px dashed rgba(255,255,255,0.12)' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
            >
              <svg className="w-8 h-8 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div className="text-center">
                <p className="text-white/50 text-sm">Click to upload photos</p>
                <p className="text-white/30 text-xs">PNG, JPG up to 10MB each</p>
              </div>
              <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>

            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-4">
                {uploadedImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img.preview} alt="" className="w-full h-20 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition"
                      style={{ background: 'rgba(239,68,68,0.9)' }}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pickup Details */}
          <div className="glass-card">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-4">Pickup Details</h3>
            <div className="space-y-4">
              <Field label="Pickup Address">
                <textarea name="pickupAddress" value={formData.pickupAddress} onChange={handleChange} className="glass-input resize-none" placeholder="Full street address" rows={2} required />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="City">
                  <input type="text" name="city" value={formData.city} onChange={handleChange} className="glass-input" placeholder="City" required />
                </Field>
                <Field label="Preferred Pickup Time">
                  <input type="datetime-local" name="preferredPickupTime" value={formData.preferredPickupTime} onChange={handleChange} className="glass-input" required />
                </Field>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-glow w-full py-4 text-base">
            {loading ? 'Submitting...' : 'Submit Donation'}
          </button>
        </form>
      </div>

      {showOtp && user?.phone && (
        <OtpModal
          phone={user.phone}
          purpose="post_donation"
          title="Verify Donation Posting"
          onVerified={handleOtpVerified}
          onCancel={() => setShowOtp(false)}
        />
      )}
    </Layout>
  );
};

export default Donate;
