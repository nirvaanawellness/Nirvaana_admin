import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_e75ff8f2-1123-40fb-9a0f-92fe681398a0/artifacts/n4ngtj4i_image.png";

const AppHeader = ({ 
  user, 
  onLogout, 
  showBack = false, 
  backTo = '/admin',
  rightContent = null,
  title = null 
}) => {
  const location = useLocation();
  const isAdminDashboard = location.pathname === '/admin';

  return (
    <header className="bg-gradient-to-r from-[#1a1512] via-[#2a241f] to-[#1a1512] border-b border-[#B89D62]/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section: Back button or Logo */}
          <div className="flex items-center gap-4">
            {showBack && (
              <Link to={backTo}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[#B89D62] hover:text-[#d4bc7c] hover:bg-[#B89D62]/10"
                  data-testid="back-button"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                </Button>
              </Link>
            )}
            
            <Link to="/admin" className="flex items-center gap-3">
              <img 
                src={LOGO_URL} 
                alt="Nirvaana Wellness"
                className="h-12 w-12 object-contain"
                data-testid="header-logo"
              />
              <div className="flex flex-col">
                <span 
                  className="text-xl font-serif tracking-wide"
                  style={{ 
                    color: '#B89D62',
                    textShadow: '0 0 10px rgba(184, 157, 98, 0.3)'
                  }}
                  data-testid="header-brand-name"
                >
                  Nirvaana Wellness
                </span>
                {title && (
                  <span className="text-xs text-[#B89D62]/60">{title}</span>
                )}
              </div>
            </Link>
          </div>

          {/* Right Section: Actions */}
          <div className="flex items-center gap-3">
            {rightContent}
            
            {isAdminDashboard && (
              <Link to="/admin/settings">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[#B89D62]/80 hover:text-[#B89D62] hover:bg-[#B89D62]/10"
                  data-testid="settings-button"
                >
                  <Settings className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Settings
                </Button>
              </Link>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLogout} 
              className="text-[#B89D62]/80 hover:text-[#B89D62] hover:bg-[#B89D62]/10"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
