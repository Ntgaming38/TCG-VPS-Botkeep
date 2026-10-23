import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { formatYen } from "@shared/formatYen";
import { Download, X, Eye } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface SalesReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: {
    id: number;
    productName: string;
    quantity: number;
    totalRevenue: number;
    saleDate: string;
    platform: string;
    saleLocation?: string;
    fee: number;
    shippingFee: number;
    otherCost: number;
    note?: string;
    profit: number;
  };
}

export default function SalesReceipt({ isOpen, onClose, saleData }: SalesReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!saleData) return null;

  const handleCapture = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        backgroundColor: "#f8fafc",
        logging: false,
        useCORS: true,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const dateStr = new Date(saleData.saleDate).toISOString().split("T")[0];
      link.download = `Receipt_${saleData.id}_${dateStr}.png`;
      link.href = image;
      link.click();
      toast.success("Đã lưu hóa đơn thành ảnh PNG!");
    } catch (error) {
      console.error("Capture error:", error);
      toast.error("Có lỗi xảy ra khi chụp hóa đơn.");
    }
  };

  const unitPrice = Math.round(Number(saleData.totalRevenue) / saleData.quantity);
  const totalFees = Number(saleData.fee) + Number(saleData.shippingFee) + Number(saleData.otherCost);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
        >
          <motion.div 
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="flex flex-col items-center w-full max-w-[400px] gap-6"
          >
            {/* Action Buttons - Minimalist Style */}
            <div className="flex w-full justify-between items-center px-2">
              <Button 
                variant="ghost" 
                onClick={onClose} 
                className="text-white hover:bg-white/10 rounded-full px-4"
              >
                <X className="h-4 w-4 mr-2" /> Đóng
              </Button>
              <Button 
                onClick={handleCapture} 
                className="bg-white text-black hover:bg-slate-200 rounded-full px-6 font-medium transition-all active:scale-95"
              >
                <Download className="h-4 w-4 mr-2" /> Lưu Ảnh
              </Button>
            </div>

            {/* Receipt Card - Luxury Minimalist */}
            <div 
              ref={receiptRef} 
              className="bg-[#F8FAFC] text-slate-800 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] w-full font-sans relative"
              style={{ minHeight: '550px' }}
            >
              {/* Subtle Gradient Accent at Top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
              
              <div className="text-center mb-10">
                <h2 className="text-2xl font-light tracking-tighter text-slate-900 mb-1">TCG MANAGER</h2>
                <div className="h-px w-8 bg-slate-300 mx-auto mb-4" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">Hóa Đơn Bán Hàng</p>
              </div>

              <div className="space-y-6 mb-10">
                {/* Meta Info */}
                <div className="flex justify-between text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                  <div className="flex flex-col gap-1">
                    <span>Mã Hóa Đơn</span>
                    <span className="text-slate-900 font-bold">#{saleData.id.toString().padStart(6, '0')}</span>
                  </div>
                  <div className="flex flex-col gap-y-1 text-right">
                    <span>Ngày Giao Dịch</span>
                    <span className="text-slate-900 font-bold">{new Date(saleData.saleDate).toLocaleString('vi-VN')}</span>
                  </div>
                </div>

                {/* Item List */}
                <div className="pt-6 border-t border-slate-200">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">
                    <span className="flex-1">Sản Phẩm</span>
                    <span className="w-10 text-center">SL</span>
                    <span className="w-20 text-right">Đơn Giá</span>
                    <span className="w-24 text-right">Thành Tiền</span>
                  </div>
                  
                  <div className="flex justify-between items-start py-3 px-1">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-semibold text-slate-900 leading-tight">{saleData.productName}</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight">{saleData.platform} • {saleData.saleLocation || 'Tổng hợp'}</p>
                    </div>
                    <span className="w-10 text-center text-sm text-slate-600">{saleData.quantity}</span>
                    <span className="w-20 text-right text-sm text-slate-600">{formatYen(unitPrice)}</span>
                    <span className="w-24 text-right text-sm font-bold text-slate-900">{formatYen(Number(saleData.totalRevenue))}</span>
                  </div>
                </div>

                {/* Financials */}
                <div className="pt-6 space-y-3">
                  {totalFees > 0 && (
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Phí & Vận Chuyển</span>
                      <span>-{formatYen(totalFees)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-end pt-4 border-t border-slate-200">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tổng Thanh Toán</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-3xl font-light tracking-tighter text-slate-900">{formatYen(Number(saleData.totalRevenue))}</span>
                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Đã Thanh Toán</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white border border-slate-100 shadow-sm rounded-2xl mb-6 rotate-3">
                   <div className="w-12 h-12 bg-slate-50 border border-slate-100 flex items-center justify-center text-[8px] text-slate-300 font-mono text-center leading-tight uppercase tracking-tighter">
                     Xác Minh<br/>An Toàn
                   </div>
                </div>
                <p className="text-xs font-medium text-slate-500 italic">Cảm ơn quý khách đã mua hàng!</p>
                <p className="text-[9px] text-slate-300 mt-1 uppercase tracking-[0.2em]">TCG Manager Global</p>
              </div>

              {/* Bottom Aesthetic Edge - Subtle ticket-style cutouts */}
              <div className="absolute -bottom-3 left-0 right-0 flex justify-between px-4">
                 <div className="w-4 h-4 bg-black/70 rounded-full -translate-y-1/2" />
                 <div className="w-4 h-4 bg-black/70 rounded-full -translate-y-1/2" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
