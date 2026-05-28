import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS: Record<string, number> = {
  open: 3000,
  action: 3000,
  champions: 3000,
  victory: 3000,
  close: 3000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  open: Scene1,
  action: Scene2,
  champions: Scene3,
  victory: Scene4,
  close: Scene5,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[var(--color-bg-dark)]">
      {/* Persistent Background FX Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 mix-blend-screen opacity-30">
        <motion.div
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, var(--color-accent), transparent)' }}
          animate={{
            x: ['0%', '30%', '-10%', '0%'],
            y: ['0%', '20%', '10%', '0%'],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, var(--color-accent-alt), transparent)' }}
          animate={{
            x: ['0%', '-30%', '10%', '0%'],
            y: ['0%', '-20%', '-10%', '0%'],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Persistent midground accent that shifts per scene */}
      <motion.div
        className="absolute w-[2px] bg-gradient-to-b from-transparent via-[var(--color-accent)] to-transparent opacity-40"
        animate={{
          left: ['15%', '80%', '35%', '65%', '20%'][sceneIndex] ?? '50%',
          height: ['40vh', '60vh', '30vh', '70vh', '50vh'][sceneIndex] ?? '50vh',
          top: ['20%', '10%', '30%', '5%', '25%'][sceneIndex] ?? '20%',
        }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      />

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
