// Configuration avancée
      const splashConfig = {
        minDuration: 2000,       // Durée minimum (ms)
        maxDuration: 3500,       // Durée maximum si chargement long
        fadeDuration: 750,       // Durée de l'estompage
        progressInterval: 50,    // Intervalle de mise à jour de la barre
        progressIncrement: 1     // Incrément de progression (%)
      };

      // Détection complète de l'appareil et orientation
      function getSplashConfig() {
        const userAgent = navigator.userAgent;
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        const isAndroid = /Android/i.test(userAgent);
        const isTablet = /iPad|Android|Tablet/i.test(userAgent) || 
                        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
        
        return {
          platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
          deviceType: isTablet ? 'tablet' : isMobile ? 'phone' : 'desktop',
          orientation: orientation
        };
      }

      // Obtenir l'image de splash appropriée
      function getSplashImage(config) {
        const basePath = 'splash';
        
        if (config.platform === 'ios') {
          if (config.deviceType === 'tablet') {
            return `${basePath}/ios/ipad-${config.orientation}.png`;
          }
          return `${basePath}/ios/iphone-${config.orientation}.png`;
        }
        
        if (config.platform === 'android') {
          if (config.deviceType === 'tablet') {
            return `${basePath}/android/tablet-${config.orientation}.png`;
          }
          return `${basePath}/android/phone-${config.orientation}.png`;
        }
        
        // Desktop par défaut
        return `${basePath}/desktop/${config.orientation}.png`;
      }

      // Afficher le splash screen avec progression
      function showSplash() {
        const config = getSplashConfig();
        const splash = document.getElementById('splash-screen');
        const splashImage = document.getElementById('splash-image');
        const progressBar = document.getElementById('progress-bar');
        
        splash.style.display = 'flex';
        splashImage.src = getSplashImage(config);
        
        let progress = 0;
        const startTime = Date.now();
        
        // Animation de la barre de progression
        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remainingTime = splashConfig.minDuration - elapsed;
          
          // Calcul dynamique de la progression
          if (remainingTime > 0) {
            progress = Math.min(
              progress + splashConfig.progressIncrement,
              (1 - (remainingTime / splashConfig.minDuration)) * 100);
          } else {
            progress = Math.min(progress + splashConfig.progressIncrement, 100);
          }
          
          progressBar.style.width = `${progress}%`;
          
          // Masquer quand tout est chargé ou durée max atteinte
          if (progress >= 100 || elapsed >= splashConfig.maxDuration) {
            clearInterval(progressInterval);
            splash.style.opacity = '0';
            
            setTimeout(() => {
              splash.remove();
            }, splashConfig.fadeDuration);
          }
        }, splashConfig.progressInterval);
      }

      // Détection du changement d'orientation
      window.addEventListener('resize', () => {
        if (document.getElementById('splash-screen')) {
          const config = getSplashConfig();
          document.getElementById('splash-image').src = getSplashImage(config);
        }
      });

      // Démarrer au chargement DOM (pas besoin d'attendre toutes les ressources)
      document.addEventListener('DOMContentLoaded', showSplash);