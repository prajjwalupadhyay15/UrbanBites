import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone, Flame, Globe, MessageCircle, Heart } from 'lucide-react';

const LINKS = {
  Company: ['About Us', 'Careers', 'Blog', 'Partner with Us'],
  Legal: ['Terms & Conditions', 'Privacy Policy', 'Cookie Policy', 'Security'],
};

export default function Footer() {
  const location = useLocation();
  if (['/login', '/register', '/checkout'].includes(location.pathname)) return null;

  return (
    <footer className="bg-white border-t border-[#EADDCD] pt-20 pb-10 mt-auto relative overflow-hidden">
      {/* Decorative Blob */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#F7B538]/5 rounded-full blur-[100px] pointer-events-none translate-x-1/2 translate-y-1/2" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-12 mb-16">

          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border-2 border-[#780116]">
                <Flame size={24} className="text-[#F7B538] fill-[#F7B538]" />
              </div>
              <span className="text-3xl font-display font-black tracking-tight text-[#780116]">
                UrbanBites
              </span>
            </Link>
            <p className="text-[#8E7B73] text-base leading-relaxed max-w-xs font-medium">
              The smartest way to satisfy your cravings — curated restaurants, lightning delivery, zero compromise.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Globe, href: '#', title: 'Website' },
                { icon: MessageCircle, href: '#', title: 'Community' },
                { icon: Heart, href: '#', title: 'Support' },
              ].map(({ icon: Icon, href, title }) => (
                <a
                  key={title}
                  href={href}
                  className="w-10 h-10 bg-[#FDF9F1] border border-[#EADDCD] rounded-2xl flex items-center justify-center text-[#2A0800] hover:text-white hover:bg-[#F7B538] hover:border-[#F7B538] transition-all shadow-sm"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(LINKS).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-[#2A0800] font-black text-lg mb-6 uppercase tracking-wider">{title}</h4>
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-[#8E7B73] text-base hover:text-[#780116] hover:translate-x-1 inline-block transition-all font-bold">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div>
            <h4 className="text-[#2A0800] font-black text-lg mb-6 uppercase tracking-wider">Contact Us</h4>
            <ul className="space-y-5">
              <li className="flex items-start gap-4 group cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-[#F1E6D8] flex items-center justify-center group-hover:bg-[#F7B538] transition-colors shrink-0">
                  <MapPin size={14} className="text-[#780116] group-hover:text-white" />
                </div>
                <span className="text-[#8E7B73] text-base font-medium leading-relaxed group-hover:text-[#2A0800] transition-colors">123 Culinary Hub, Food District, Delhi 110001</span>
              </li>
              <li className="flex items-center gap-4 group cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-[#F1E6D8] flex items-center justify-center group-hover:bg-[#F7B538] transition-colors shrink-0">
                  <Phone size={14} className="text-[#780116] group-hover:text-white" />
                </div>
                <span className="text-[#8E7B73] text-base font-bold group-hover:text-[#2A0800] transition-colors">+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-4 group cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-[#F1E6D8] flex items-center justify-center group-hover:bg-[#F7B538] transition-colors shrink-0">
                  <Mail size={14} className="text-[#780116] group-hover:text-white" />
                </div>
                <span className="text-[#8E7B73] text-base font-bold group-hover:text-[#2A0800] transition-colors">support@urbanbites.in</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#EADDCD] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[#8E7B73] text-sm font-medium">© {new Date().getFullYear()} UrbanBites. All rights reserved.</p>
          <div className="flex gap-6 text-[#8E7B73] text-sm font-bold">
            <span className="hover:text-[#780116] cursor-pointer transition-colors">🇮🇳 India</span>
            <span className="hover:text-[#780116] cursor-pointer transition-colors">English</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
