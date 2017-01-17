export default class MusicPlayer {
  player: any;

  install() {
    const tub = document.createElement('div');
    document.body.appendChild(tub);

    (window as any).onYouTubeIframeAPIReady = () => {
      const YT = (window as any).YT;

      this.player = new YT.Player(tub, {
        width: '0',
        height: '0',
        videoId: 'HTio1Jel3bA',

        playerVars: {
          playsinline: '1',
        } as any,

        events: {
          onReady: () => {
            // force preloading
            this.player.seekTo(0);
            this.player.pauseVideo();

            setInterval(() => {
              if (this.player.getCurrentTime() >= 81) {
                this.player.seekTo(0);
              }
            }, 250);
          }
        },
      })
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
  }

  play() {
    this.player.playVideo();
  }
}