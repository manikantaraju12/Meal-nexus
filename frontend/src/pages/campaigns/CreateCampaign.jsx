import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignAPI } from '../../utils/api';
import Layout from '../../components/Layout';

const CreateCampaign = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', type: 'food',
    targetQuantity: '', targetUnit: 'meals',
    deadline: '', city: '', state: '', coverImage: '',
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await campaignAPI.create({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        target: {
          quantity: parseInt(formData.targetQuantity) || 0,
          unit: formData.targetUnit,
          deadline: formData.deadline ? new Date(formData.deadline) : undefined,
        },
        location: { city: formData.city, state: formData.state },
        coverImage: formData.coverImage || undefined,
        status: 'active',
      });
      navigate('/campaigns');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, children }) => (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-2">{label}</label>
      {children}
    </div>
  );

  return (
    <Layout title="Create Campaign">
      <div className="max-w-2xl mx-auto">
        <div className="glass-card stat-blue mb-6">
          <h2 className="text-xl font-bold text-white mb-1">Launch a Campaign</h2>
          <p className="text-white/60 text-sm">Organize a food donation drive and inspire your community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="glass-card space-y-4">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide">Campaign Details</h3>

            <Field label="Title">
              <input type="text" name="title" value={formData.title} onChange={handleChange} className="glass-input" placeholder="Feed 1000 Children This Month" required />
            </Field>

            <Field label="Description">
              <textarea name="description" value={formData.description} onChange={handleChange} className="glass-input resize-none" placeholder="Describe the goals and impact of this campaign..." rows={4} required />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Campaign Type">
                <select name="type" value={formData.type} onChange={handleChange} className="glass-select">
                  <option value="food">Food</option>
                  <option value="emergency">Emergency</option>
                </select>
              </Field>
              <Field label="Deadline">
                <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} className="glass-input" required />
              </Field>
            </div>
          </div>

          <div className="glass-card space-y-4">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide">Target</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Target Quantity">
                <input type="number" name="targetQuantity" value={formData.targetQuantity} onChange={handleChange} className="glass-input" placeholder="1000" required />
              </Field>
              <Field label="Unit">
                <select name="targetUnit" value={formData.targetUnit} onChange={handleChange} className="glass-select">
                  <option value="meals">Meals</option>
                  <option value="kg">Kilograms</option>
                  <option value="items">Items</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="glass-card space-y-4">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide">Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City">
                <input type="text" name="city" value={formData.city} onChange={handleChange} className="glass-input" placeholder="City" required />
              </Field>
              <Field label="State">
                <input type="text" name="state" value={formData.state} onChange={handleChange} className="glass-input" placeholder="State" required />
              </Field>
            </div>
          </div>

          <div className="glass-card space-y-4">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide">Media (Optional)</h3>
            <Field label="Cover Image URL">
              <input type="url" name="coverImage" value={formData.coverImage} onChange={handleChange} className="glass-input" placeholder="https://example.com/image.jpg" />
            </Field>
          </div>

          <button type="submit" disabled={loading} className="btn-glow w-full py-4 text-base">
            {loading ? 'Creating...' : 'Launch Campaign'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default CreateCampaign;
