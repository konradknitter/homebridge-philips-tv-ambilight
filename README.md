# Homebridge Philips TV Ambilight

This plug-in provides support for Homebridge Philips TV Ambilight.

## Info

Plug-in tested on 49PUS7101 ( API 6.2.0 ) & 75PUS7354 ( API 6.4.0 )

Working:

- Turning on Ambilight. Including Wake over LAN.
- Control of Color
    - Not solved bug: Philips TV uses different values than Apple for Hue and Saturation. I see that Hue is moved ~30 degree.

What's next?

- Switch of Ambilight modes
- ... ?

This roadmap should led to 1.0 release.

# Authentication

Authentication is not needed for models I tested. Ambilight is supported on unauthorized port 1925.

# Plug-in configuration

    {
        "accessory": "PhilipsTVAmbilight",
        "name": "Some Room TV Ambilight",
        "ip": "IP ADDRESS",
        "macAddress": "MAC ADDRESS"
    }

# References

Key knowledge about Philips TV APIs https://github.com/eslavnov/pylips/wiki