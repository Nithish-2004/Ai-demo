import { motion } from "framer-motion";
import { Shield, AlertTriangle } from "lucide-react";
import { Card } from "./ui/card";

interface ViolationCounterProps {
  count: number;
  limit: number;
}

export const ViolationCounter = ({ count, limit }: ViolationCounterProps) => {
  const percentage = (count / limit) * 100;
  const isWarning = count >= limit * 0.6;
  const isCritical = count >= limit * 0.8;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <motion.div
          animate={count > 0 ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {isCritical ? (
            <AlertTriangle className="h-6 w-6 text-red-500" />
          ) : (
            <Shield 
              className={`h-6 w-6 ${
                isWarning ? "text-yellow-500" : "text-green-500"
              }`} 
            />
          )}
        </motion.div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Integrity Monitor</span>
            <motion.span 
              key={count}
              initial={{ scale: 1.3, color: "hsl(var(--primary))" }}
              animate={{ scale: 1, color: "hsl(var(--foreground))" }}
              className={`text-sm font-bold ${
                isCritical ? "text-red-500" : isWarning ? "text-yellow-500" : "text-green-500"
              }`}
            >
              {count}/{limit}
            </motion.span>
          </div>

          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isCritical 
                  ? "bg-red-500" 
                  : isWarning 
                  ? "bg-yellow-500" 
                  : "bg-green-500"
              }`}
            />
          </div>

          {count > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-muted-foreground mt-1"
            >
              {limit - count} {limit - count === 1 ? "violation" : "violations"} remaining
            </motion.p>
          )}
        </div>
      </div>
    </Card>
  );
};
