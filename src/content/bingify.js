/***************************************************************************************************
 *
 *  Bingify: Makes Google look a little bit like Bing
 *  Copyright © 2019 Florian Schneidereit
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 *  and associated documentation files (the "Software"), to deal in the Software without
 *  restriction, including without limitation the rights to use, copy, modify, merge, publish,
 *  distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 *  Software is furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in all copies or
 *  substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 *  BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 *  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 *  DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 **************************************************************************************************/

/* Constants */
const bingUrl = "https://www.bing.com";
const hpImageArchiveUrl = "https://www.bing.com/HPImageArchive.aspx";

/* Global Variables */
var hpImageArchive;
var hpCurrentImage;

/* Bingify */
function bingify() {
    console.log("Bingify started.");
    console.log("Local start date: " + bingify_getLocalStartDate());

    // Get or request HP image archive
    bingify_getHpImageArchiveAsync().then(
        function() {
            // Get or request current HP image
            bingify_getHpCurrentImageAsync().then(
                function() {
                    // Show the image and hook search box
                    bingify_showHpCurrentImage();
                    bingify_hookSearchBox();
                },
                function(error) {
                    bingify_logError(error);
                }
            );
        },
        function(error) {
            bingify_logError(error);
        }
    );
}

/* Faded the background image. */
function bingify_fadeBackground() {
    let viewport = document.getElementById("viewport");
    if (viewport) {
        viewport.style.backgroundImage =
            "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), " +
            "url(" + hpCurrentImage + ")";
    }
}

/* Gets the current HP image asynchronously. */
function bingify_getHpCurrentImageAsync() {
    return new Promise(function(resolve, reject) {
        // Check if the image is present in local storage
        browser.storage.local.get("hpCurrentImage").then(
            function(item) {
                if (item.hpCurrentImage != undefined) {
                    hpCurrentImage = item.hpCurrentImage;
                    resolve();
                } else {
                    bingify_requestHpCurrentImageAsync().then(
                        function(result) {
                            hpCurrentImage = result;
                            bingify_saveHpCurrentImageAsync().then(
                                function() {
                                    resolve();
                                },
                                function(error) {
                                    reject(error);
                                }
                            );
                        },
                        function(error) {
                            reject(error);
                        }
                    );
                }
            },
            function(error) {
                reject(error);
            }
        );
    });
}

/* Gets the current HP image title */
function bingify_getHpCurrentImageCopyright() {
    return hpImageArchive.images[0].copyright;
}

/* Gets the current HP image search URL */
function bingify_getHpCurrentImageSearchUrl() {
    let copyrightLink = hpImageArchive.images[0].copyrightlink;
    let qParam = new URL(copyrightLink).searchParams.get("q");
    if (qParam) {
        return encodeURI("https://www.google.com/search?q=" + qParam);
    }
    return copyrightLink;
}

/* Gets the current HP image title */
function bingify_getHpCurrentImageTitle() {
    return hpImageArchive.images[0].title;
}

/* Gets the HP image archive asynchronously. */
function bingify_getHpImageArchiveAsync() {
    return new Promise(function(resolve, reject) {
        // Check if the archive is present in local storage
        browser.storage.local.get("hpImageArchive").then(
            function(item) {
                if (item.hpImageArchive != undefined) {
                    const archiveDate = parseInt(item.hpImageArchive.images[0].startdate);
                    const currentDate = bingify_getLocalStartDate();
                    if (currentDate > archiveDate) {
                        browser.storage.local.clear().then(
                            function() {
                                bingify_requestHpImageArchiveAsync().then(
                                    function(result) {
                                        hpImageArchive = result;
                                        bingify_saveHpImageArchiveAsync().then(
                                            function() {
                                                resolve();
                                            },
                                            function(error) {
                                                reject(error);
                                            }
                                        );
                                    },
                                    function(error) {
                                        reject(error);
                                    }
                                );
                            },
                            function(error) {
                                reject(error);
                            }
                        );
                    } else {
                        hpImageArchive = item.hpImageArchive;
                        resolve();
                    }
                } else {
                    // If false, request HP image archive data from Bing
                    bingify_requestHpImageArchiveAsync().then(
                        function(result) {
                            hpImageArchive = result;
                            bingify_saveHpImageArchiveAsync().then(
                                function() {
                                    resolve();
                                },
                                function(error) {
                                    reject(error);
                                }
                            );
                        },
                        function(error) {
                            reject(error);
                        }
                    );
                }
            },
            function(error) {
                reject(error);
            }
        );
    });
}

/* Gets the local start date to obtain the current Bing image. */
function bingify_getLocalStartDate() {
    let d = new Date();
    return (d.getFullYear() * 10000) + ((d.getMonth() + 1) * 100) + d.getDate();
}

/* Hook search input box. */
function bingify_hookSearchBox() {
    let q = document.getElementsByName("q")[0];
    if (q) {
        q.addEventListener("blur", function() {
            bingify_restoreBackground();
        });
        q.addEventListener("focus", function(e) {
            bingify_fadeBackground();
        });
        q.addEventListener("keypress", function(e) {
            bingify_fadeBackground();
        });
    }
}

/* Log error. */
function bingify_logError(error) {
    console.log("Bingify Error: " + error);
}

/* Requests the current HP image from Bing asynchronously. */
function bingify_requestHpCurrentImageAsync() {
    return new Promise(function(resolve, reject) {
        const hpImageRequest = new XMLHttpRequest();
        hpImageRequest.open("GET", bingUrl + hpImageArchive.images[0].url);
        hpImageRequest.responseType = "arraybuffer";
        hpImageRequest.timeout = 10000;
        hpImageRequest.addEventListener("load", function() {
            const hpImageBlob = new Blob([hpImageRequest.response]);
            if (hpImageBlob) {
                let hpImageReader = new FileReader();
                hpImageReader.addEventListener("load", function() {
                    resolve(hpImageReader.result);
                });
                hpImageReader.readAsDataURL(hpImageBlob);
            }
        });
        hpImageRequest.addEventListener("error", function() {
            reject(hpImageRequest.statusText);
        });
        hpImageRequest.addEventListener("timeout", function() {
            reject("The request for the current HP image timed out.");
        });
        hpImageRequest.send();
    });
}

/* Requests the HP image archive from Bing asynchronously. */
function bingify_requestHpImageArchiveAsync() {
    return new Promise(function(resolve, reject) {
        const hpImageArchiveRequest = new XMLHttpRequest();
        const requestParams = "?format=js&idx=0&n=1";
        hpImageArchiveRequest.open("GET", hpImageArchiveUrl + requestParams, true);
        hpImageArchiveRequest.responseType = "json";
        hpImageArchiveRequest.timeout = 10000;
        hpImageArchiveRequest.addEventListener("load", function() {
            resolve(hpImageArchiveRequest.response);
        });
        hpImageArchiveRequest.addEventListener("error", function() {
            reject(hpImageArchiveRequest.statusText);
        });
        hpImageArchiveRequest.addEventListener("timeout", function() {
            reject("The request for the HP image archive timed out.");
        });
        hpImageArchiveRequest.send();
    });
}

/* Restores the faded background image. */
function bingify_restoreBackground() {
    let viewport = document.getElementById("viewport");
    if (viewport) {
        viewport.style.backgroundImage = "url(" + hpCurrentImage + ")";
    }
}

/* Saves the current image to local storage asynchronously. */
function bingify_saveHpCurrentImageAsync() {
    return browser.storage.local.set({hpCurrentImage});
}

/* Saves the Bing HP image archive to local storage asynchronously. */
function bingify_saveHpImageArchiveAsync() {
    return browser.storage.local.set({hpImageArchive});
}

/* Shows the current HP image. */
function bingify_showHpCurrentImage() {
    // Bingify the viewport
    let viewport = document.getElementById("viewport");
    if (viewport) {
        viewport.classList.add("bingified_viewport");
        viewport.style.backgroundImage = "url(" + hpCurrentImage + ")";
    }
    // Bingify the Google logo
    let hplogo = document.getElementById("hplogo");
    if (hplogo) {
        hplogo.classList.add("bingified_hplogo");
    }
    // Bingify top hyperlinks
    let hptl = document.getElementById("gb");
    if (hptl) {
        if (hpImageArchive.images[0].drk == 1) {
            let hptlLinks = hptl.getElementsByTagName("a");
            if (hptlLinks) {
                for (let i = 0; i < hptlLinks.length; i++) {
                    hptlLinks.item(i).classList.add("bingified_hptla");
                }
            }
        }
    }
    // Bingify promo area
    let prm = document.getElementById("prm");
    if (prm) {
        prm.classList.add("bingified_prm");
    }
    // Bingify footer bar
    let fbar = document.getElementById("fbar");
    if (fbar) {
        let fbarClass = fbar.getElementsByClassName("b0KoTc").item(0);
        if (fbarClass) {
            // Create and style background title span
            let backgroundTitleSpan = document.createElement("span");
            backgroundTitleSpan.id = "bingified_image_title";

            // Create and style background quiz link
            let backgroundQuizA = document.createElement("a");
            backgroundQuizA.href = bingify_getHpCurrentImageSearchUrl();
            backgroundQuizA.textContent = bingify_getHpCurrentImageTitle();

            // Add background quiz link to title span
            backgroundTitleSpan.append(backgroundQuizA);

            // Create and initialize panorama icon image
            let panoramaIconImg = document.createElement("object");
            panoramaIconImg.classList.add("bingified_button_obj");
            panoramaIconImg.id = "bingified_panorama";
            panoramaIconImg.title = bingify_getHpCurrentImageCopyright();

            // Add panorama icon image to background title span
            backgroundTitleSpan.append(panoramaIconImg);

            // Add background title span to fbar class
            fbarClass.append(backgroundTitleSpan);
        }
    }
}

/* Bingify! */
bingify();
